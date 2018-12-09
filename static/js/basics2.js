"use strict";

(() => {
  const showDistanceColors = false;
  var selectedNodeId = "";
  var binaryTreeSVG;

  const treeNodes = [];
  const treeEdges = [];
  const hoveredEdgeLabels = [];

  const binaryPrefix = "0b";
  const offset = binaryPrefix.length;

  const colors = [
    "#EE6352",
    "#FFB847",
    "#0CCE6B",
    "#C17FFF",
    "#FF7FE3",
    "#BBFF47"
  ];

  const selectedNodeColor = "#00CBFF";
  const selectedPathColor = "#00CBFF";

  const noSelectedGraphNodeColor = "#EEE";
  const noSelectedColor = "#AAA";
  const noSelectedLightColor = "#AAA";

  const treeNodeNotInGraphColor = "#FFFFFF";

  function dec2bin(dec) {
    const raw = (dec >>> 0).toString(2);
    const padding = "000000";
    const withPadding = padding + raw;
    return withPadding.substring(withPadding.length - padding.length);
  }

  function bin2dec(bin) {
    if (bin.startsWith(binaryPrefix)) {
      return parseInt(bin.substring(binaryPrefix.length), 2);
    } else {
      return parseInt(bin, 2);
    }
  }

  function getCommonPrefixLength(s1, s2, offset) {
    var index = offset;
    while (index < s1.length && s1[index] === s2[index]) {
      index++;
    }
    return index - offset;
  }

  // Returns the position of the provided SVG element.
  function getPos(svg, elem) {
    var matrix, position;

    matrix = elem.getCTM();
    position = svg.createSVGPoint();
    position.x = elem.getAttribute("cx");
    position.y = elem.getAttribute("cy");
    position = position.matrixTransform(matrix);
    return position;
  }

  function render_tree() {
    var draw,
      height,
      width,
      padding,
      circle,
      group,
      group2,
      children,
      i,
      label,
      n,
      newChildren,
      line;

    height = 400;
    width = 600;
    padding = 75;

    draw = SVG("binary-tree");
    binaryTreeSVG = draw;
    draw.size(width, height);

    group2 = draw.group();
    group = draw.group();

    children = [];
    n = Math.pow(2, 6);

    // Draw leaves
    for (i = 0; i < n; i++) {
      circle = draw.circle(10);
      circle.cx((width / (n + 1)) * (i + 1));
      circle.cy(height - padding);
      circle.attr("data-id", binaryPrefix + dec2bin(i));
      circle.mouseover(onNodeMouseOver);
      circle.mouseout(onNodeMouseOut);
      group.add(circle);
      children.push(circle);
      treeNodes.push(circle);
    }

    while (children.length > 1) {
      newChildren = [];
      for (i = 0; i < children.length - 1; i += 2) {
        var child1Pos = getPos(draw.native(), children[i].native());
        var child2Pos = getPos(draw.native(), children[i + 1].native());
        const child1Id = children[i].attr("data-id").toString();
        const child2Id = children[i + 1].attr("data-id").toString();

        // Draw parent
        circle = draw.circle(10);
        circle.cx((child1Pos.x + child2Pos.x) / 2);
        circle.cy(child1Pos.y - (height - 2 * padding) / Math.log2(n));
        circle.attr("data-id", child1Id.substring(0, child1Id.length - 1));
        group.add(circle);
        newChildren.push(circle);
        treeNodes.push(circle);

        var parentPos = getPos(draw.native(), circle.native());

        // Draw edges between parent and children
        line = draw.line(child1Pos.x, child1Pos.y, parentPos.x, parentPos.y);
        line.attr("data-id", child1Id);
        line.stroke({ width: 2 });
        group2.add(line);
        treeEdges.push(line);

        line = draw
          .line(child2Pos.x, child2Pos.y, parentPos.x, parentPos.y)
          .stroke({ width: 2 });
        line.attr("data-id", child2Id);
        line.stroke({ width: 2 });
        group2.add(line);
        treeEdges.push(line);
      }
      if (newChildren.length === 1) {
        label = draw.text("0");
        label.attr("font-family", "Roboto");
        label.x((child1Pos.x + parentPos.x) / 2 - label.bbox().width * 2);
        label.y((child1Pos.y + parentPos.y) / 2 - label.bbox().height - 3);
        group.add(label);

        label = draw.text("1");
        label.attr("font-family", "Roboto");
        label.x((child2Pos.x + parentPos.x) / 2 + label.bbox().width * 2);
        label.y((child2Pos.y + parentPos.y) / 2 - label.bbox().height - 3);
        group.add(label);
      }

      children = newChildren;
    }
  }

  function updateSelectedLabel() {
    if (selectedNodeId === "") {
      $("#selected-leaf-display").html(
        `<b><i>Hover over a leaf node to view its associated ID.</i></b>`
      );
    } else {
      $("#selected-leaf-display").html(
        `You are hovering over the leaf corresponding to <b>${selectedNodeId} (${bin2dec(
          selectedNodeId
        )})</b>.`
      );
    }
  }

  function updateTree() {
    // Remove previously hovered labels
    hoveredEdgeLabels.forEach(label => label.remove());

    for (var i = 0; i < treeNodes.length; i++) {
      var node = treeNodes[i];
      if (selectedNodeId.startsWith(node.attr("data-id"))) {
        node.fill(selectedNodeColor);
      } else if (selectedNodeId === "" || !showDistanceColors) {
        node.fill(noSelectedColor);
      } else {
        const commonPrefixLength = getCommonPrefixLength(
          selectedNodeId,
          node.attr("data-id"),
          offset
        );
        node.fill(colors[commonPrefixLength]);
      }
    }

    for (i = 0; i < treeEdges.length; i++) {
      var edge = treeEdges[i];
      if (selectedNodeId.startsWith(edge.attr("data-id"))) {
        edge.stroke({ color: selectedPathColor, width: 10, linecap: "round" });

        if (edge.attr("data-id").length > "0b0".length) {
          // Only add labels for non-top level edges
          const bit = edge.attr("data-id")[edge.attr("data-id").length - 1];
          const label = binaryTreeSVG.text(bit);
          label.attr("font-family", "Roboto");
          if (bit === "0") {
            label.x(
              (edge.attr("x1") + edge.attr("x2")) / 2 - label.bbox().width / 2
            );
          } else {
            label.x(
              (edge.attr("x1") + edge.attr("x2")) / 2 - label.bbox().width / 2
            );
          }
          label.y(
            (edge.attr("y1") + edge.attr("y2")) / 2 - label.bbox().height / 2
          );
          hoveredEdgeLabels.push(label);
        }
      } else if (selectedNodeId === "" || !showDistanceColors) {
        edge.stroke({ color: noSelectedColor, width: 2, linecap: "round" });
      } else {
        const commonPrefixLength = getCommonPrefixLength(
          selectedNodeId,
          edge.attr("data-id"),
          offset
        );
        edge.stroke({
          color: colors[commonPrefixLength],
          width: 4,
          linecap: "round"
        });
      }
    }
  }

  function onNodeMouseOver(e) {
    selectedNodeId = e.target.getAttribute("data-id");
    updateTree();
    updateSelectedLabel();
  }

  function onNodeMouseOut() {
    selectedNodeId = "";
    updateTree();
    updateSelectedLabel();
  }

  // Initialize the DHT diagram.
  render_tree();
  updateTree();
  updateSelectedLabel();
})(this);
