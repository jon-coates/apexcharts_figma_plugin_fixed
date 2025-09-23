// src/main.ts
figma.showUI(__html__, { width: 1200, height: 800 });
async function insertSvg(svg, name, chartWidth, chartHeight) {
  try {
    await figma.loadFontAsync({ family: "Anek Latin", style: "Regular" });
    await figma.loadFontAsync({ family: "Anek Latin", style: "Medium" });
    await figma.loadFontAsync({ family: "Anek Latin", style: "SemiBold" });
  } catch (error) {
    console.log("Font loading failed:", error);
  }
  const node = figma.createNodeFromSvg(svg);
  node.name = name;
  function updateTextNodes(node2) {
    if (node2.type === "TEXT") {
      const textNode = node2;
      try {
        textNode.fontName = { family: "Anek Latin", style: "Regular" };
      } catch (error) {
        try {
          textNode.fontName = { family: "Inter", style: "Regular" };
        } catch (fallbackError) {
          console.log("Using default font for text node");
        }
      }
    }
    if ("children" in node2) {
      node2.children.forEach((child) => updateTextNodes(child));
    }
  }
  updateTextNodes(node);
  const frame = figma.createFrame();
  frame.name = name + " Frame";
  let frameWidth;
  let frameHeight;
  const padding = 16;
  frameWidth = (chartWidth || 600) + padding * 2;
  frameHeight = (chartHeight || 400) + padding * 2;
  frameWidth = Math.max(frameWidth, 200);
  frameHeight = Math.max(frameHeight, 200);
  frame.resize(frameWidth, frameHeight);
  node.x = padding;
  node.y = padding;
  frame.appendChild(node);
  const maxWidth = frameWidth - padding * 2;
  const maxHeight = frameHeight - padding * 2;
  const scaleX = maxWidth / node.width;
  const scaleY = maxHeight / node.height;
  const scale = Math.min(scaleX, scaleY, 1);
  const newWidth = node.width * scale;
  const newHeight = node.height * scale;
  node.resizeWithoutConstraints(newWidth, newHeight);
  node.x = (frameWidth - newWidth) / 2;
  node.y = (frameHeight - newHeight) / 2;
  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}
figma.ui.onmessage = async (msg) => {
  if (msg.type === "insert-svg" && typeof msg.svg === "string") {
    let title = "Apex Chart";
    let chartWidth;
    let chartHeight;
    if (msg.meta && typeof msg.meta.title === "string") {
      title = msg.meta.title;
    }
    if (msg.meta && typeof msg.meta.width === "number") {
      chartWidth = msg.meta.width;
    }
    if (msg.meta && typeof msg.meta.height === "number") {
      chartHeight = msg.meta.height;
    }
    await insertSvg(msg.svg, title, chartWidth, chartHeight);
    figma.notify("Chart inserted as editable vectors");
  }
  if (msg.type === "resize-window" && typeof msg.width === "number" && typeof msg.height === "number") {
    figma.ui.resize(msg.width, msg.height);
  }
  if (msg.type === "close") {
    figma.closePlugin();
  }
};
