"use strict";

(() => {
  var selectedNodeId = "";
  var originNodeId = "";
  var idToFind = "";
  var currentFrame = 0;
  var graphSVGDoc;
  var treeSVGDoc;

  var graphNodes = [];
  var graphEdges = [];
  var treeNodes = [];
  var treeEdges = [];
  var kBuckets = {};
  const kBucketRects = {};

  const alphaContacts = [];
  const maxHeapComparator = (x, y) => {
    if (x.distance < y.distance) {
      return 1;
    }
    if (x.distance > y.distance) {
      return -1;
    }
    return 0;
  };
  const closestNodes = new Heap(maxHeapComparator);

  const minFrame = 0;
  const maxFrame = 6;

  const binaryPrefix = "0b";
  const offset = binaryPrefix.length;

  const nodes = [1,11,21,31,32,35,37,46,50,55,58,59,62,63];
  const joinNodeId = 28;
  const joinNodeDataId = binaryPrefix + dec2bin(joinNodeId);
  var knownNodeId = 0;
  var knownNodeDataId = binaryPrefix + dec2bin(knownNodeId);

  const k = 4;
  const alpha = 3;

  const numNodes = 15;
  const graphWidth = 400;
  const graphHeight = 400;
  const graphPadding = 20;
  const graphRadius = graphWidth / 2 - graphPadding * 2;
  const nodeSize = 40;

  const bucketWidth = 90;
  const bucketHeight = 60;
  const padding = 10;

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
  const joiningNodeColor = "#00F893";
  const rpcRecipientColor = "#6495ED";

  const noSelectedGraphNodeColor = "#EEE";
  const noSelectedColor = "#000";
  const noSelectedLightColor = "#AAA";

  const idToFindTreeColor = "#133670";
  const closestNodesColor = "#2160c4";

  const rpcMsgColor = "#000000";

  //-----------------
  // Helper functions
  //-----------------

  // Convert decimal to binary
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

  function getDistance(bin1, bin2) {
    return bin2dec(bin1) ^ bin2dec(bin2);
  }

  // Returns the position of the provided SVG element.
  function getPos(svg, elem) {
    var matrix, position;

    matrix = elem.getCTM();
    position = svg.createSVGPoint();
    position.x =
      elem.getAttribute("cx") !== null
        ? elem.getAttribute("cx")
        : elem.getAttribute("x");
    position.y =
      elem.getAttribute("cy") !== null
        ? elem.getAttribute("cy")
        : elem.getAttribute("y");
    position = position.matrixTransform(matrix);
    return position;
  }

  function idsToString(ids) {
    const tokens = [];
    ids.forEach(id => {
      tokens.push(`${id} (${bin2dec(id)})`);
    });
    return tokens.join(", ");
  }

  function idsToStringContacted(heapArray) {
    const tokens = [];
    heapArray.forEach(entry => {
      tokens.push(
        `<b><span style="color: ${closestNodesColor}">${
          entry.nodeId
        } (${bin2dec(entry.nodeId)})</span></b> [${
          entry.contacted ? "contacted" : "not contacted"
        }]`
      );
    });
    return tokens.join(", ");
  }

  //-----------------
  // Render functions
  //-----------------

  // Renders the Kademlia graph.
  function render_graph(n, nodes, nodeColors) {
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

    deg = 0;

    while (nodes.length < n) {
      id = Math.floor(Math.random() * Math.pow(2, 6));
      if (!nodes.includes(id)) {
        nodes.push(id);
      }
    }
    nodes.sort((a, b) => a - b);

    draw = graphSVGDoc;
    draw.clear();
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
      if (nodes[i] in nodeColors) {
        circle.fill(nodeColors[nodes[i]]);
      } else {
        circle.fill(noSelectedGraphNodeColor);
      }
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

  // Renders tree
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

    draw = treeSVGDoc;
    draw.clear();
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

  function drawKBuckets(
    svgId,
    titleId,
    kbucketsForNodeId,
    isFindNodeRPC,
    closestIds
  ) {
    var draw,
      labelGroup,
      label,
      label2,
      rectGroup,
      rectangle,
      xPos,
      yPos,
      closestIdCircle,
      highlightGroup,
      highlightRect;

    document.getElementById(
      titleId
    ).innerHTML = `<b>k-buckets for ${kbucketsForNodeId} (${bin2dec(
      kbucketsForNodeId
    )})</b>`;

    $(`#${svgId}`).empty();
    draw = SVG(svgId);
    highlightGroup = draw.group();
    rectGroup = draw.group();
    labelGroup = draw.group();

    const radius = 5;
    const closestIdCircleSize = 15;

    draw.size(
      (bucketWidth + padding) * k + padding,
      (bucketHeight + padding) * 6
    );

    kBucketRects[svgId] = {};
    const entries = Object.entries(kBuckets[kbucketsForNodeId]);
    entries.forEach(([commonPrefixLength, nodes]) => {
      nodes.forEach((nodeId, nodeIndex) => {
        xPos = nodeIndex * (bucketWidth + padding) + bucketWidth / 2 + padding;
        yPos =
          commonPrefixLength * (bucketHeight + padding) +
          bucketHeight / 2 +
          padding;

        rectangle = draw
          .rect(bucketWidth, bucketHeight)
          .radius(radius)
          .cx(xPos)
          .cy(yPos)
          .attr("data-id", nodeId)
          .fill(colors[commonPrefixLength]);
        rectGroup.add(rectangle);

        if (idToFind !== "" && !isFindNodeRPC) {
          if (
            parseInt(commonPrefixLength) ===
            getCommonPrefixLength(idToFind, kbucketsForNodeId, offset)
          ) {
            highlightRect = draw
              .rect(bucketWidth + padding, bucketHeight + padding)
              .cx(xPos)
              .cy(yPos)
              .fill(idToFindTreeColor);
            highlightGroup.add(highlightRect);

            if (alphaContacts.length < alpha) {
              alphaContacts.push(nodeId);
            }
          }
        }

        label = draw.text(nodeId);
        label.x(xPos - label.bbox().width / 2);
        label.y(yPos - label.bbox().height / 2 - padding);
        label.attr("data-id", nodeId);
        label.attr("font-family", "Roboto");
        labelGroup.add(label);

        label2 = draw.text(`(${bin2dec(nodeId)})`);
        label2.x(xPos - label2.bbox().width / 2);
        label2.y(yPos - label2.bbox().height / 2 + padding);
        label2.attr("data-id", nodeId);
        label2.attr("font-family", "Roboto");
        labelGroup.add(label2);

        kBucketRects[svgId][nodeId] = [rectangle, label, label2];

        if (closestIds && closestIds.includes(nodeId)) {
          closestIdCircle = draw
            .circle(closestIdCircleSize)
            .fill(closestNodesColor)
            .x(xPos + bucketWidth / 4)
            .y(yPos + bucketHeight / 9)
            .attr("data-id", nodeId);
          labelGroup.add(closestIdCircle);
        }
      });
    });
  }

  function drawSendRPC(fromDataId, toDataId) {
    var fromNode, toNode;
    for (var i = 0; i < graphNodes.length; i++) {
      if (graphNodes[i].attr("data-id") === fromDataId) {
        fromNode = graphNodes[i];
      }
      if (graphNodes[i].attr("data-id") === toDataId) {
        toNode = graphNodes[i];
      }
    }

    var draw = graphSVGDoc;
    var startPos = getPos(draw.native(), fromNode.native());
    var endPos = getPos(draw.native(), toNode.native());

    var rpc = draw.circle(10);
    rpc.fill(rpcMsgColor);
    rpc.cx(startPos.x).cy(startPos.y);
    rpc.animate({duration: '1500'}).move(endPos.x, endPos.y).loop();

    if (fromNode.attr("data-id") !== joinNodeDataId) {
      fromNode.fill(rpcRecipientColor);
    }
    if (toNode.attr("data-id") !== joinNodeDataId) {
      toNode.fill(rpcRecipientColor);
    }

    // var line = draw.line(startPos.x, startPos.y, endPos.x, endPos.y);
    // line.stroke({
    //   color: rpcArrowColor,
    //   width: 4,
    //   linecap: "round"
    // });
  }

  //-----------------
  // Update functions
  //-----------------
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
    var nodeId, otherNodeId;

    for (var i = 0; i < graphNodes.length; i++) {
      nodeId = graphNodes[i].attr("data-id");

      kBuckets[nodeId] = {};
      for (var j = 0; j < graphNodes.length; j++) {
        otherNodeId = graphNodes[j].attr("data-id");
        if (otherNodeId === nodeId) continue;

        const commonPrefixLength = getCommonPrefixLength(
          nodeId,
          otherNodeId,
          offset
        );
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

  //----------------------
  // Interaction functions
  //----------------------
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

  //-----------------
  // Frame functions
  //-----------------
  function populateText(step_text, sim_text) {
  	const stepTextDiv = document.getElementById("step-num");
  	var stepText = "<p><b>" + step_text + "</b></p>";
  	stepTextDiv.innerHTML = stepText;

  	const simTextDiv = document.getElementById("simulation-text");
  	var simText = "<p>" + sim_text + "</p>";
  	simTextDiv.innerHTML = simText;
  }

  function resetVariables() {
  	selectedNodeId = "";
  	originNodeId = "";
  	idToFind = "";
  	graphSVGDoc;
  	treeSVGDoc;
  	graphNodes = [];
  	graphEdges = [];
  	treeNodes = [];
  	treeEdges = [];
  	kBuckets = {};
  }

  function frame0() {
  	resetVariables();

    // Draw graph with joining node on side
  	render_graph(numNodes-1, nodes, {});
    var draw = graphSVGDoc;
    var circle = draw.circle(nodeSize);
    circle.fill(joiningNodeColor);
    circle.cx(nodeSize).cy(nodeSize);

  	render_tree();
  	populateText("Join Simulation", "Press Next to begin stepping through Join simulation.");
  }

  function frame1() {
  	resetVariables();

    // Draw graph with joining node on side with nodeID
  	render_graph(numNodes-1, nodes, {});
    var draw = graphSVGDoc;
    var circle = draw.circle(nodeSize);
    circle.fill(joiningNodeColor);
    circle.cx(nodeSize).cy(nodeSize);

    // Assign attributes
    var dataId = binaryPrefix + dec2bin(joinNodeId);
    circle.attr("node-id", joinNodeId);
    circle.attr("data-id", dataId);

    // Display node ID in binary
    var pos1 = getPos(draw.native(), circle.native());
    var label = draw.plain(dec2bin(joinNodeId));
    label.x(pos1.x - label.native().getBBox().width / 2);
    label.y(pos1.y - 20);
    label.attr("data-id", dataId);
    label.attr("font-family", "Roboto");

    // Display node ID in decimal
    var label2 = draw.plain("(" + joinNodeId.toString() + ")");
    label2.x(pos1.x - label2.native().getBBox().width / 2);
    label2.y(pos1.y - 2);
    label2.attr("data-id", dataId);
    label2.attr("font-family", "Roboto");

  	render_tree();
  	populateText("Step 1", `The joining node is assigned a nodeID, <b>${joinNodeDataId} (${joinNodeId})</b>...`);
  }

  function frame2() {
  	resetVariables();

    // Draw graph with join node included
    var frameNodes = nodes.slice(0);
    frameNodes.push(joinNodeId);
    var nodeColors = {};
    nodeColors[joinNodeId] = joiningNodeColor;
  	render_graph(numNodes, frameNodes, nodeColors);

  	render_tree();
  	populateText("Step 2", `...and it is added to the node graph.`);
  }

  function frame3() {
  	resetVariables();

    // Draw graph with join node included
    var frameNodes = nodes.slice(0);
    frameNodes.push(joinNodeId);
    var nodeColors = {};
    nodeColors[joinNodeId] = joiningNodeColor;
  	render_graph(numNodes, frameNodes, nodeColors);

    // Draw kbuckets for join node
    kBuckets[joinNodeDataId] = {};
    knownNodeId = 50;
    knownNodeDataId = binaryPrefix + dec2bin(knownNodeId);
    const commonPrefixLength = getCommonPrefixLength(
      joinNodeDataId, knownNodeDataId, offset);
    kBuckets[joinNodeDataId][commonPrefixLength] = [knownNodeDataId];
    drawKBuckets("kbuckets", "kbuckets-title", joinNodeDataId, true);

  	render_tree();
  	populateText("Step 3", `The joining node's k-buckets table is initialized with another known node, <b>${knownNodeDataId} (${knownNodeId})</b>.`);
  }

  function frame4() {
  	resetVariables();

    // Draw graph with join node included
    var frameNodes = nodes.slice(0);
    frameNodes.push(joinNodeId);
    var nodeColors = {};
    nodeColors[joinNodeId] = joiningNodeColor;
  	render_graph(numNodes, frameNodes, nodeColors);

    // Draw kbuckets for join node
    kBuckets[joinNodeDataId] = {};
    const commonPrefixLength = getCommonPrefixLength(
      joinNodeDataId, knownNodeDataId, offset);
    kBuckets[joinNodeDataId][commonPrefixLength] = [knownNodeDataId];
    drawKBuckets("kbuckets", "kbuckets-title", joinNodeDataId, true);

  	render_tree();
  	populateText("Step 4", "The joining node performs <a href='../lookup/index.html'>Lookup</a> on itself in order to fill its k-buckets table.");
  }

  function frame5() {
  	resetVariables();

    // Draw graph with join node included
    var frameNodes = nodes.slice(0);
    frameNodes.push(joinNodeId);
    var nodeColors = {};
    nodeColors[joinNodeId] = joiningNodeColor;
  	render_graph(numNodes, frameNodes, nodeColors);

    // Draw RPC from join node to known node
    drawSendRPC(joinNodeDataId, knownNodeDataId);

    // Draw kbuckets for join node
    kBuckets[joinNodeDataId] = {};
    const commonPrefixLength = getCommonPrefixLength(
      joinNodeDataId, knownNodeDataId, offset);
    kBuckets[joinNodeDataId][commonPrefixLength] = [knownNodeDataId];
    drawKBuckets("kbuckets", "kbuckets-title", joinNodeDataId, true);

  	render_tree();
  	populateText("Step 5", `It sends a FIND_NODE RPC for itself, <b>${joinNodeDataId} (${joinNodeId})</b>, to the other node it knows, <b>${knownNodeDataId} (${knownNodeId})</b>`);
  }

  function frame6() {
  	resetVariables();

    // Draw graph with join node included
    var frameNodes = nodes.slice(0);
    frameNodes.push(joinNodeId);
    var nodeColors = {};
    nodeColors[joinNodeId] = joiningNodeColor;
  	render_graph(numNodes, frameNodes, nodeColors);

    // Draw RPC from join node to known node
    drawSendRPC(knownNodeDataId, joinNodeDataId);

    // Draw kbuckets for join node
    kBuckets[joinNodeDataId] = {};
    const commonPrefixLength = getCommonPrefixLength(
      joinNodeDataId, knownNodeDataId, offset);
    kBuckets[joinNodeDataId][commonPrefixLength] = [knownNodeDataId];
    drawKBuckets("kbuckets", "kbuckets-title", joinNodeDataId, true);

    // TODO update kbuckets

  	render_tree();
  	populateText("Step 6", `When the joining node receives a response from <b>${knownNodeDataId} (${knownNodeId})</b>, it updates its k-buckets.`);
  }

  function frame10() {
    resetVariables();

    var frameNodes = nodes.slice(0);
    frameNodes.push(joinNodeId);
    var nodeColors = {};
    nodeColors[joinNodeId] = joiningNodeColor;
  	render_graph(numNodes, frameNodes, nodeColors);

    render_tree();
    populateText("Step 10", "The joining node refreshes all its buckets with the information it has received.");
  }

  function getFrame(i) {
    frames = [
      frame0,
      frame1,
      frame2,
      frame3,
      frame4,
      frame5,
      frame6
    ]
    return frames[i];
  }

  $("#prev-btn").click(function() {
    currentFrame = Math.max(minFrame, currentFrame-1);
    console.log("Clicked previous button; currentFrame=", currentFrame);
    var frame = getFrame(currentFrame);
    frame();
  });

  $("#next-btn").click(function() {
    currentFrame = Math.min(maxFrame, currentFrame+1);
    console.log("Clicked next button; currentFrame=", currentFrame);
    var frame = getFrame(currentFrame);
    frame();
  });

  function initFrame() {
    graphSVGDoc = SVG("graph");
    treeSVGDoc = SVG("binary-tree");
    frame0();
  }

  // Initialize the Join simulation.
  initFrame();

})(this);
