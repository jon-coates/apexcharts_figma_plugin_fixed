// Main thread (no DOM access)
figma.showUI(__html__, { width: 1200, height: 800 });

async function insertSvg(svg: string, name: string, chartWidth?: number, chartHeight?: number) {
  // Load the Anek Latin font family in Figma
  try {
    await figma.loadFontAsync({ family: "Anek Latin", style: "Regular" });
    await figma.loadFontAsync({ family: "Anek Latin", style: "Medium" });
    await figma.loadFontAsync({ family: "Anek Latin", style: "SemiBold" });
  } catch (error) {
    console.log("Font loading failed:", error);
    // Continue anyway - Figma will use fallback fonts
  }

  const node = figma.createNodeFromSvg(svg);
  node.name = name;

  // Function to recursively find and update text nodes
  function updateTextNodes(node: BaseNode) {
    if (node.type === "TEXT") {
      const textNode = node as TextNode;
      try {
        // Try to set the font to Anek Latin
        textNode.fontName = { family: "Anek Latin", style: "Regular" };
      } catch (error) {
        // If Anek Latin is not available, try other fallbacks
        try {
          textNode.fontName = { family: "Inter", style: "Regular" };
        } catch (fallbackError) {
          // Use default font if others fail
          console.log("Using default font for text node");
        }
      }
    }
    
    // Recursively process children
    if ("children" in node) {
      node.children.forEach(child => updateTextNodes(child));
    }
  }

  // Update all text nodes in the created SVG
  updateTextNodes(node);

  const frame = figma.createFrame();
  frame.name = name + " Frame";
  
  // Always use chart dimensions with padding
  let frameWidth: number;
  let frameHeight: number;
  
  const padding = 16;
  
  // Use chart dimensions with padding (fallback to defaults if not provided)
  frameWidth = (chartWidth || 600) + padding * 2;
  frameHeight = (chartHeight || 400) + padding * 2;
  
  // Ensure minimum frame size
  frameWidth = Math.max(frameWidth, 200);
  frameHeight = Math.max(frameHeight, 200);
  
  frame.resize(frameWidth, frameHeight);

  node.x = padding;
  node.y = padding;
  frame.appendChild(node);

  // Scale the chart to fit within the frame while maintaining aspect ratio
  const maxWidth = frameWidth - padding * 2;
  const maxHeight = frameHeight - padding * 2;
  
  const scaleX = maxWidth / node.width;
  const scaleY = maxHeight / node.height;
  
  // Always use chart dimensions behaviour: don't scale up, only down if necessary
  const scale = Math.min(scaleX, scaleY, 1);
  const newWidth = node.width * scale;
  const newHeight = node.height * scale;
  
  node.resizeWithoutConstraints(newWidth, newHeight);
  
  // Center the chart within the frame
  node.x = (frameWidth - newWidth) / 2;
  node.y = (frameHeight - newHeight) / 2;

  figma.currentPage.appendChild(frame);
  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "insert-svg" && typeof msg.svg === "string") {
    let title = "Apex Chart";
    let chartWidth: number | undefined;
    let chartHeight: number | undefined;
    
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
