"use strict";

var selectedNodeId = "";
const graphNodes = [];
const graphEdges = [];
const treeNodes = [];
const treeEdges = [];

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
const noSelectedColor = "#000";
const noSelectedLightColor = "#AAA";

(() => {
  function dec2bin(dec) {
    const raw = (dec >>> 0).toString(2);
    const padding = "000000";
    const withPadding = padding + raw;
    return withPadding.substring(withPadding.length - padding.length);
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

  // Renders the Kademlia graph.
  function render_graph() {
    var width,
      height,
      padding,
      radius,
      draw,
      circle,
      i,
      j,
      n,
      deg,
      group,
      group2,
      pathGroup,
      label,
      label2,
      line,
      nodes,
      id;

    width = 400;
    height = 400;
    padding = 20;

    n = 15;
    deg = 0;

    nodes = [];
    while (nodes.length < n) {
      id = Math.floor(Math.random() * Math.pow(2, 6));
      if (!nodes.includes(id)) {
        nodes.push(id);
      }
    }
    nodes.sort((a, b) => a - b);

    draw = SVG("drawing");
    draw.size(width, height);
    radius = width / 2 - padding * 2;

    pathGroup = draw.group();
    pathGroup.attr("id", "kademlia-paths");
    group = draw.group();
    group.translate(width / 2, height / 2);
    group.attr("id", "kademlia-nodes");
    group2 = draw.group();
    group2.attr("id", "kademlia-labels");

    // Create the nodes.
    for (i = 0; i < n; i++) {
      var dataId = "0b" + dec2bin(nodes[i]);

      // Draw node circle
      circle = draw.circle(40);
      circle.fill(noSelectedGraphNodeColor);
      deg += 360 / n;
      circle.cx(0).cy(-radius);
      circle.attr("transform", "rotate(" + deg + ")");
      circle.attr("node-id", nodes[i]);
      circle.attr("data-id", dataId);
      group.add(circle);
      graphNodes.push(circle);

      var pos1 = getPos(draw.native(), circle.native());

      // Display node ID in binary
      label = draw.plain(dec2bin(nodes[i]));
      label.x(pos1.x - label.native().getBBox().width / 2);
      label.y(pos1.y - 20);
      label.native().setAttribute("data-id", dataId);
      group2.add(label);

      // Display node ID in decimal
      label2 = draw.plain("(" + nodes[i].toString() + ")");
      label2.x(pos1.x - label2.native().getBBox().width / 2);
      label2.y(pos1.y - 2);
      label2.native().setAttribute("data-id", dataId);
      group2.add(label2);

      circle.mouseover(onNodeMouseOver);
      circle.mouseout(onNodeMouseOut);
      label.mouseover(onNodeMouseOver);
      label.mouseout(onNodeMouseOut);
      label2.mouseover(onNodeMouseOver);
      label2.mouseout(onNodeMouseOut);
    }

    // Draw the paths
    for (i = 0; i < n; i++) {
      for (j = i + 1; j < n; j++) {
        var startPos = getPos(draw.native(), graphNodes[i].native());
        var endPos = getPos(draw.native(), graphNodes[j].native());
        line = draw.line(startPos.x, startPos.y, endPos.x, endPos.y);
        line.stroke({
          color: noSelectedLightColor,
          width: 1,
          linecap: "round"
        });
        line.addClass(graphNodes[i].attr("data-id"));
        line.addClass(graphNodes[j].attr("data-id"));
        pathGroup.add(line);
        graphEdges.push(line);
      }
    }
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
      circle.attr("data-id", "0b" + dec2bin(i));
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
        label.x(
          (child1Pos.x + parentPos.x) / 2 - label.native().getBBox().width * 2
        );
        label.y(
          (child1Pos.y + parentPos.y) / 2 - label.native().getBBox().height
        );
        group.add(label);

        label = draw.text("1");
        label.x(
          (child2Pos.x + parentPos.x) / 2 + label.native().getBBox().width * 2
        );
        label.y(
          (child2Pos.y + parentPos.y) / 2 - label.native().getBBox().height
        );
        group.add(label);
      }

      children = newChildren;
    }
  }

  function updateGraph() {
    const offset = "0b".length;
    for (var i = 0; i < graphNodes.length; i++) {
      var node = graphNodes[i];
      if (selectedNodeId === "") {
        node.fill(noSelectedGraphNodeColor);
      } else if (selectedNodeId === node.attr("data-id")) {
        node.fill(selectedNodeColor);
      } else {
        var index = offset;
        while (
          index < selectedNodeId.length &&
          selectedNodeId[index] === node.attr("data-id")[index]
        ) {
          index++;
        }
        node.fill(colors[index - offset]);
      }
    }

    for (i = 0; i < graphEdges.length; i++) {
      var edge = graphEdges[i];
      var edgeClasses = edge.classes();
      if (edgeClasses.includes(selectedNodeId)) {
        var index = offset;
        var otherNodeId;
        for (var j = 0; j < edgeClasses.length; j++) {
          if (
            edgeClasses[j].startsWith("0b") &&
            edgeClasses[j] !== selectedNodeId
          ) {
            otherNodeId = edgeClasses[j];
            break;
          }
        }
        while (
          index < selectedNodeId.length &&
          selectedNodeId[index] === otherNodeId[index]
        ) {
          index++;
        }
        edge.stroke({ color: colors[index - offset], width: 2 });
      } else {
        edge.stroke({ color: noSelectedLightColor, width: 1 });
      }
    }
  }

  function updateTree() {
    for (var i = 0; i < treeNodes.length; i++) {
      var node = treeNodes[i];
      if (selectedNodeId.startsWith(node.attr("data-id"))) {
        node.fill(selectedNodeColor);
      } else {
        node.fill(noSelectedColor);
      }
    }

    for (i = 0; i < treeEdges.length; i++) {
      var edge = treeEdges[i];
      if (selectedNodeId.startsWith(edge.attr("data-id"))) {
        edge.stroke({ color: selectedPathColor, width: 10, linecap: "round" });
      } else {
        edge.stroke({ color: noSelectedColor, width: 2, linecap: "round" });
      }
    }
  }

  function onNodeMouseOver(e) {
    selectedNodeId = e.target.getAttribute("data-id");
    updateTree();
    updateGraph();
  }

  function onNodeMouseOut() {
    selectedNodeId = "";
    updateTree();
    updateGraph();
  }

  // Initialize the DHT diagram.
  render_graph();
  render_tree();
})(this);
