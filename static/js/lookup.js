"use strict";

(() => {
  var selectedNodeId = "";
  var originNodeId = "";
  var idToFind = "";
  const graphNodes = [];
  const graphEdges = [];
  const treeNodes = [];
  const treeEdges = [];
  const kBuckets = {};
  const k = 4;

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
  const noSelectedColor = "#000";
  const noSelectedLightColor = "#AAA";

  const idToFindTreeColor = "#133670";

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

    draw = SVG("graph");
    draw.size(width, height);
    radius = width / 2 - padding * 2;

    pathGroup = draw.group();
    pathGroup.attr("id", "lookup-kademlia-paths");
    group = draw.group();
    group.translate(width / 2, height / 2);
    group.attr("id", "lookup-kademlia-nodes");
    group2 = draw.group();
    group2.attr("id", "lookup-kademlia-labels");

    // Create the nodes.
    for (i = 0; i < n; i++) {
      var dataId = binaryPrefix + dec2bin(nodes[i]);

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
      label.attr("data-id", dataId);
      label.attr("font-family", "Roboto");
      group2.add(label);

      // Display node ID in decimal
      label2 = draw.plain("(" + nodes[i].toString() + ")");
      label2.x(pos1.x - label2.native().getBBox().width / 2);
      label2.y(pos1.y - 2);
      label2.attr("data-id", dataId);
      label2.attr("font-family", "Roboto");
      group2.add(label2);

      circle.mouseover(onNodeMouseOver);
      circle.mouseout(onNodeMouseOut);
      circle.click(onNodeClicked);
      label.mouseover(onNodeMouseOver);
      label.mouseout(onNodeMouseOut);
      label.click(onNodeClicked);
      label2.mouseover(onNodeMouseOver);
      label2.mouseout(onNodeMouseOut);
      label2.click(onNodeClicked);
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
      circle.attr("data-id", binaryPrefix + dec2bin(i));
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
          (child1Pos.y + parentPos.y) / 2 - label.native().getBBox().height - 3
        );
        group.add(label);

        label = draw.text("1");
        label.x(
          (child2Pos.x + parentPos.x) / 2 + label.native().getBBox().width * 2
        );
        label.y(
          (child2Pos.y + parentPos.y) / 2 - label.native().getBBox().height - 3
        );
        group.add(label);
      }

      children = newChildren;
    }
  }

  function updateGraph() {
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
        const commonPrefixLength = index - offset;
        node.fill(colors[commonPrefixLength]);

        if (
          originNodeId !== "" &&
          !kBuckets[originNodeId][commonPrefixLength].includes(
            node.attr("data-id")
          )
        ) {
          node.opacity(0.3);
        }
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
        const commonPrefixLength = index - offset;
        edge.stroke({ color: colors[commonPrefixLength], width: 2 });

        if (
          originNodeId !== "" &&
          !kBuckets[originNodeId][commonPrefixLength].includes(otherNodeId)
        ) {
          edge.opacity(0.3);
        }
      } else {
        edge.stroke({ color: noSelectedLightColor, width: 1 });
      }
    }
  }

  function updateTree() {
    var index;

    for (var i = 0; i < treeNodes.length; i++) {
      var node = treeNodes[i];
      if (selectedNodeId === "") {
        node.fill(noSelectedColor);
      } else if (selectedNodeId.startsWith(node.attr("data-id"))) {
        node.fill(selectedNodeColor);
      } else {
        index = offset;
        while (
          index < selectedNodeId.length &&
          selectedNodeId[index] === node.attr("data-id")[index]
        ) {
          index++;
        }
        node.fill(colors[index - offset]);
      }
    }

    for (i = 0; i < treeEdges.length; i++) {
      var edge = treeEdges[i];
      if (selectedNodeId === "") {
        edge.stroke({ color: noSelectedColor, width: 2, linecap: "round" });
      } else if (selectedNodeId.startsWith(edge.attr("data-id"))) {
        edge.stroke({ color: selectedPathColor, width: 10, linecap: "round" });
      } else {
        index = offset;
        while (
          index < selectedNodeId.length &&
          selectedNodeId[index] === edge.attr("data-id")[index]
        ) {
          index++;
        }
        edge.stroke({
          color: colors[index - offset],
          width: 4,
          linecap: "round"
        });
      }
    }
  }

  function updateKBuckets() {
    var index, nodeId, otherNodeId;

    for (var i = 0; i < graphNodes.length; i++) {
      nodeId = graphNodes[i].attr("data-id");

      kBuckets[nodeId] = {};
      for (var j = 0; j < graphNodes.length; j++) {
        otherNodeId = graphNodes[j].attr("data-id");

        index = offset;
        while (index < nodeId.length && nodeId[index] === otherNodeId[index]) {
          index++;
        }

        const commonPrefixLength = index - offset;
        if (!(commonPrefixLength in kBuckets[nodeId])) {
          kBuckets[nodeId][commonPrefixLength] = [otherNodeId];
        } else if (kBuckets[nodeId][commonPrefixLength].length < k) {
          kBuckets[nodeId][commonPrefixLength].push(otherNodeId);
        }
      }
    }
  }

  function updateTreeWithIdToFind() {
    for (var i = 0; i < treeNodes.length; i++) {
      const node = treeNodes[i];
      if (node.attr("data-id") === idToFind) {
        node.fill(idToFindTreeColor);
      }
    }
  }

  function onNodeClicked(e) {
    if (originNodeId !== "") return;
    originNodeId = e.target.getAttribute("data-id");
    document.getElementById(
      "message"
    ).innerHTML = `<p>You have selected Node <b>${originNodeId}</b> to originate the lookup.</p>`;
    document.getElementById("message2").innerHTML = `
    <p>We will use system-wide parameters <b><i>k</i> = 4</b> and <b><i>alpha</i> = 2</b>.</p>
    <p><i>k</i> represents the max number of nodes in each k-bucket. <i>alpha</i> is the concurrency parameter.</p>`;
    updateKBuckets();
    updateTree();
    updateGraph();

    setTimeout(() => {
      while (idToFind === "") {
        idToFind = prompt(
          "What ID would you like to look up (e.g. 0b101111 or 47)?",
          originNodeId === "0b101111" || originNodeId === "47"
            ? "0b101110"
            : "0b101111"
        );

        if (idToFind.startsWith(binaryPrefix)) {
          for (var i = offset; i < idToFind.length; i++) {
            if (
              i >= "0b000000".length ||
              (idToFind[i] !== "0" && idToFind[i] !== "1")
            ) {
              idToFind = "";
              break;
            }
          }
        } else {
          if (idToFind < 0 || idToFind >= Math.pow(2, 6)) {
            idToFind = "";
          }
        }
      }

      if (!idToFind.startsWith(binaryPrefix)) {
        idToFind = binaryPrefix + dec2bin(idToFind);
      }
      document.getElementById(
        "message"
      ).innerHTML = `<p>Looking up <b>ID ${idToFind} (${parseInt(
        idToFind.substring(binaryPrefix.length),
        2
      )})</b> from <b>Node ${originNodeId}</b>.</p>`;

      updateTreeWithIdToFind();
    }, 1000);
  }

  function onNodeMouseOver(e) {
    if (originNodeId !== "") return;
    selectedNodeId = e.target.getAttribute("data-id");
    updateTree();
    updateGraph();
  }

  function onNodeMouseOut() {
    if (originNodeId !== "") return;
    selectedNodeId = "";
    updateTree();
    updateGraph();
  }

  // Initialize the DHT diagram.
  render_graph();
  render_tree();
})(this);
