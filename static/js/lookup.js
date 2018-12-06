"use strict";

(() => {
  var selectedNodeId = "";
  var originNodeId = "";
  var idToFind = "";
  var currentModalFrame = 0;
  var roundNum = 1;
  var alphaContacts = [];
  const allContactedNodes = [];

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
  const kBuckets = {};

  const nodes = [];
  const graphNodes = [];
  const graphEdges = [];
  const treeNodes = [];
  const treeEdges = [];
  const k = 4;
  const alpha = 3;
  const kBucketRects = {};
  const alphaContactEdges = [];
  var alphaContactEdgeGroup;

  const modalFramesPerRPC = 2;

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

  const idToFindTreeColor = "#133670";
  const closestNodesColor = "#2160c4";

  const treeNodeNotInGraphColor = "#FFFFFF";

  const bucketWidth = 90;
  const bucketHeight = 60;
  const padding = 10;

  var graphCanvas;
  var treeCanvas;

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
    if (offset === undefined) offset = binaryPrefix.length;
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

  function hasAnimation(kBucketOwner, kBucketIndex, candidateNode) {
    return (
      (kBuckets[kBucketOwner][kBucketIndex].includes(candidateNode) &&
        kBuckets[kBucketOwner][kBucketIndex].indexOf(candidateNode) <
          kBuckets[kBucketOwner][kBucketIndex].length - 1) ||
      !kBuckets[kBucketOwner][kBucketIndex].includes(candidateNode)
    );
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
      id;

    width = 400;
    height = 400;
    padding = 20;

    n = 15;
    deg = 0;

    while (nodes.length < n) {
      id = Math.floor(Math.random() * Math.pow(2, 6));
      if (!nodes.includes(id)) {
        nodes.push(id);
      }
    }
    nodes.sort((a, b) => a - b);

    draw = SVG("graph");
    graphCanvas = draw;
    draw.size(width, height);
    radius = width / 2 - padding * 2;

    pathGroup = draw.group();
    pathGroup.attr("id", "lookup-kademlia-paths");
    alphaContactEdgeGroup = draw.group();
    alphaContactEdgeGroup.attr("id", "lookup-kademlia-contact-paths");
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
    treeCanvas = draw;
    draw.size(width, height);

    group2 = draw.group();
    group = draw.group();

    children = [];
    n = Math.pow(2, 6);

    // Draw leaves
    for (i = 0; i < n; i++) {
      circle = draw.circle(9);
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
        const commonPrefixLength = getCommonPrefixLength(
          selectedNodeId,
          node.attr("data-id"),
          offset
        );
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
        const commonPrefixLength = getCommonPrefixLength(
          selectedNodeId,
          otherNodeId,
          offset
        );
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
    for (var i = 0; i < treeNodes.length; i++) {
      var node = treeNodes[i];
      const nodeInGraph =
        nodes.includes(bin2dec(node.attr("data-id"))) ||
        node.attr("data-id").length < "0b000000".length;
      if (selectedNodeId === "") {
        node.fill(nodeInGraph ? noSelectedColor : treeNodeNotInGraphColor);
        node.stroke({ color: noSelectedColor, width: 2 });
      } else if (selectedNodeId.startsWith(node.attr("data-id"))) {
        node.fill(nodeInGraph ? selectedNodeColor : treeNodeNotInGraphColor);
        node.stroke({ color: selectedNodeColor, width: 2 });
      } else {
        const commonPrefixLength = getCommonPrefixLength(
          selectedNodeId,
          node.attr("data-id"),
          offset
        );
        node.fill(
          nodeInGraph ? colors[commonPrefixLength] : treeNodeNotInGraphColor
        );
        node.stroke({ color: colors[commonPrefixLength], width: 2 });
      }
    }

    for (i = 0; i < treeEdges.length; i++) {
      var edge = treeEdges[i];
      if (selectedNodeId === "") {
        edge.stroke({ color: noSelectedColor, width: 2, linecap: "round" });
      } else if (selectedNodeId.startsWith(edge.attr("data-id"))) {
        edge.stroke({ color: selectedPathColor, width: 10, linecap: "round" });
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

  function populateAlphaContacts() {
    const buckets = Object.values(kBuckets[originNodeId]);
    for (var i = 0; i < buckets.length; i++) {
      for (var j = 0; j < buckets[i].length; j++) {
        if (alphaContacts.length >= alpha) return;

        if (!(buckets[i][j] in alphaContacts)) {
          alphaContacts.push(buckets[i][j]);
        }
      }
    }
  }

  function populateLocalNodeInfo() {
    $("#local-node-info").html(
      `<p><b>Round ${roundNum}</b> contacts are <span style="color: ${idToFindTreeColor};"><b>${idsToString(
        alphaContacts
      )}</b></span>.</p>`
    );
    $("#local-node-info").show();

    updateGraphWithAlphaContacts();
    $("#send-find-node-button").show();
    $("#send-find-node-button").html(
      `Send FIND_NODE RPC to Round ${roundNum} contacts`
    );
    $("#send-find-node-button").on("click", () => {
      $("#find-node-modal").modal();
      $("#find-node-modal").one("shown.bs.modal", () => {
        $("#modal-next-btn").html("Next");
        $("#modal-previous-btn").hide();
        currentModalFrame = 0;
        populateModal();
      });
    });
    $("#rpc-response-container").hide();
  }

  function populateModal() {
    if (currentModalFrame > 0) {
      // $("#modal-previous-btn").show();
      $("#modal-previous-btn").one("click", () => {
        currentModalFrame -= 1;
        populateModal();
        $("modal-next-btn").off();
      });
    }

    const alphaContactIndex = Math.floor(currentModalFrame / modalFramesPerRPC);
    switch (currentModalFrame % modalFramesPerRPC) {
      case 0:
        populateModalKClosest(alphaContactIndex);
        break;
      case 1:
        populateModalUpdateKBuckets(alphaContactIndex);
        break;
    }
  }

  function populateModalKClosest(alphaContactIndex) {
    const alphaContact = alphaContacts[alphaContactIndex];

    document.getElementById(
      "find-node-modal-body"
    ).innerHTML = `<p><span><b>Target ID:</b> ${idToFind} (${bin2dec(
      idToFind
    )})</span><br>
    <span><b>Requester:</b> ${originNodeId} (${bin2dec(
      originNodeId
    )})</span><br>
    <span><b>Recipient:</b> ${alphaContact} (${bin2dec(
      alphaContact
    )})</span></p>`;

    const closestIds = findKClosest(alphaContact, idToFind, originNodeId);
    drawKBuckets(
      "modal-kbuckets-svg",
      "modal-kbuckets-title",
      alphaContact,
      true,
      closestIds
    );

    $("#modal-button-container").hide();
    $("#find-node-modal-step").html("<p><b>Step 1</b></p>");
    $("#find-node-modal-body-2").html(
      `<p>The k closest nodes to Target ID ${idToFind} (${bin2dec(
        idToFind
      )}) are:<ul>${closestIds
        .map(nodeId => `<li>${nodeId} (${bin2dec(nodeId)})</li>`)
        .join("")}</ul></p>
        <p>The ID address, port, and nodeID for these k closest nodes will be sent in the response RPC.</p>`
    );

    // Show second step when user clicks Next button
    $("#modal-next-btn").one("click", () => {
      currentModalFrame += 1;
      $("#modal-previous-btn").off();
      populateModal();
    });
  }

  function populateModalUpdateKBuckets(alphaContactIndex) {
    const alphaContact = alphaContacts[alphaContactIndex];

    const kBucketIndex = getCommonPrefixLength(
      originNodeId,
      alphaContact,
      offset
    );

    drawKBuckets(
      "modal-kbuckets-svg",
      "modal-kbuckets-title",
      alphaContact,
      true
    );

    const containsContact = kBuckets[alphaContact][kBucketIndex].includes(
      originNodeId
    );
    const isFull = kBuckets[alphaContact][kBucketIndex].length == k;
    const firstContact =
      kBuckets[alphaContact][kBucketIndex] &&
      kBuckets[alphaContact][kBucketIndex][0];
    if (hasAnimation(alphaContact, kBucketIndex, originNodeId)) {
      $("#modal-button-container").show();
    } else {
      $("#modal-button-container").hide();
    }
    $("#view-animation-button").prop("disabled", false);
    $("#view-animation-button").off("click");
    $("#view-animation-button").on("click", () => {
      $("#view-animation-button").prop("disabled", true);
      animateKBucketUpdate(
        "modal-kbuckets-svg",
        originNodeId,
        alphaContact,
        kBucketIndex
      );
    });
    $("#reset-animation-button").off("click");
    $("#reset-animation-button").on("click", () => {
      drawKBuckets(
        "modal-kbuckets-svg",
        "modal-kbuckets-title",
        alphaContact,
        true
      );
      $("#view-animation-button").prop("disabled", false);
    });
    // $("#modal-previous-btn").show();
    $("#find-node-modal-step").html("<p><b>Step 2</b></p>");
    $("#find-node-modal-body-2").html(
      `<p>The RPC recipient updates its k-bucket corresponding to the RPC sender <span style="background-color: ${
        colors[kBucketIndex]
      }">${originNodeId} (${bin2dec(originNodeId)})</span>.<ul>
      ${
        containsContact
          ? "<li>The contact is already contained in the k-bucket. It will be moved to the tail of the bucket.</li>"
          : "<li>The contact is not contained in the k-bucket.</li>"
      }
      ${
        !containsContact && !isFull
          ? "<li>The k-bucket is not full, so we add the contact to the end of the list.</li>"
          : ""
      }
      ${
        !containsContact && isFull
          ? `<li>The bucket is full, so the RPC recipient pings the contact
      at the head of the bucket's list, ${firstContact} (${bin2dec(
              firstContact
            )}). The least recently seen contact responds within
      a reasonable time, so it is moved to the tail. The new contact is ignored.</li>`
          : ""
      }
      </ul></p>`
    );

    if (alphaContactIndex + 1 < alphaContacts.length) {
      $("#modal-next-btn").one("click", () => {
        currentModalFrame += 1;
        $("#modal-previous-btn").off();
        populateModal();
      });
    } else {
      $("#send-find-node-button").off();
      $("#modal-next-btn").html("Finish");
      $("#modal-next-btn").one("click", () => {
        $("#modal-previous-btn").off();
        $("#find-node-modal").modal("hide");
        var nodesReturned = [];
        var kClosestUpdated = false;
        alphaContacts.forEach(alphaContact => {
          const kClosest = findKClosest(alphaContact, idToFind, originNodeId);
          nodesReturned.push(
            `<p><b>${alphaContact} (${bin2dec(
              alphaContact
            )})</b>: ${idsToString(kClosest)}</p>`
          );

          // Update k-closest local state on origin node
          kClosest.forEach(nodeId => {
            const distance = getDistance(nodeId, idToFind);

            var notInHeap = true;
            closestNodes.toArray().forEach(cnode => {
              if (cnode.nodeId === nodeId) notInHeap = false;
            });

            if (notInHeap) {
              if (closestNodes.size() < k) {
                closestNodes.push({
                  nodeId,
                  distance,
                  contacted:
                    allContactedNodes.includes(nodeId) ||
                    alphaContacts.includes(nodeId)
                });
                kClosestUpdated = true;
              } else if (
                distance < closestNodes.peek().distance &&
                nodeId !== originNodeId
              ) {
                closestNodes.replace({
                  nodeId,
                  distance,
                  contacted:
                    allContactedNodes.includes(nodeId) ||
                    alphaContacts.includes(nodeId)
                });
                kClosestUpdated = true;
              }
            }
          });
        });

        $("#rpc-response-container").html(
          `<p><b>FIND_NODE Responses</b></p><p><i><b>Contact node</b>: k-closest nodes to target</i></p>
          ${nodesReturned.join("")}`
        );
        $("#shortlist-container").html(
          `<p><b>k-closest nodes</b>: ${idsToStringContacted(
            closestNodes.toArray()
          )}</p>`
        );
        $("#shortlist-container").show();
        updateTree();
        updateTreeWithClosestNodes();
        updateTreeWithIdToFind();
        updateOriginKBuckets(alphaContacts);

        const newAlphaContacts = [];

        if (kClosestUpdated) {
          // Send FIND_NODE requests to alpha contacts
          roundNum += 1;

          closestNodes.toArray().forEach(entry => {
            if (!entry.contacted && newAlphaContacts.length < alpha) {
              entry.contacted = true;
              newAlphaContacts.push(entry.nodeId);
            }
          });

          allContactedNodes.concat(alphaContacts);
          alphaContacts = newAlphaContacts;

          if (alphaContacts.length === 0) {
            displayFinalKContacts();
          } else {
            populateLocalNodeInfo();
          }
        } else {
          allContactedNodes.concat(alphaContacts);

          closestNodes.toArray().forEach(entry => {
            if (!entry.contacted) {
              entry.contacted = true;
              newAlphaContacts.push(entry.nodeId);
            }
          });

          allContactedNodes.concat(alphaContacts);
          alphaContacts = newAlphaContacts;

          $("#local-node-info")
            .html(`<p style="color: #28a745;"><b>No new nodes were returned that 
          were closer than the previous k-closest.</b></p>`);

          if (alphaContacts.length === 0) {
            displayFinalKContacts();
            $("#send-find-node-button").hide();
          } else {
            populateLocalNodeInfo();
          }
        }
        $("#rpc-response-container").show();
      });
    }
  }

  function updateOriginKBuckets(alphaContacts) {
    alphaContacts.forEach(contactId => {
      const kBucketIndex = getCommonPrefixLength(
        contactId,
        originNodeId,
        offset
      );
      if (kBuckets[originNodeId][kBucketIndex].includes(contactId)) {
        // Move contactId to end
        const contactIndex = kBuckets[originNodeId][kBucketIndex].indexOf(
          contactId
        );
        kBuckets[originNodeId][kBucketIndex].splice(contactIndex, 1);
        kBuckets[originNodeId][kBucketIndex].push(contactId);
      } else if (kBuckets[originNodeId][kBucketIndex].length < k) {
        // Add contactId to end
        kBuckets[originNodeId][kBucketIndex].push(contactId);
      } else {
        // Ping first node in bucket and move to end
        const firstId = kBuckets[originNodeId][kBucketIndex][0];
        kBuckets[originNodeId][kBucketIndex].splice(0, 1);
        kBuckets[originNodeId][kBucketIndex].push(firstId);
      }
    });

    drawKBuckets("kbuckets", "kbuckets-title", originNodeId, false);
  }

  function displayFinalKContacts() {
    $("#final-results-container").html(
      `<p>The following nodes are the k closest to <b>Target ID ${idToFind} (${bin2dec(
        idToFind
      )})</b>:</p><ul>${closestNodes
        .toArray()
        .map(
          node =>
            `<li>${node.nodeId} (${bin2dec(
              node.nodeId
            )}) - distance ${getDistance(node.nodeId, idToFind)}</li>`
        )
        .join("")}</ul>`
    );
    $("#final-results-container").show();
  }

  function findKClosest(startNodeId, targetId, requesterId) {
    const maxHeap = new Heap(maxHeapComparator);

    const buckets = Object.values(kBuckets[startNodeId]);
    for (var i = 0; i < buckets.length; i++) {
      for (var j = 0; j < buckets[i].length; j++) {
        const currentNode = buckets[i][j];

        if (maxHeap.size() < k) {
          maxHeap.push({
            nodeId: currentNode,
            distance: getDistance(currentNode, targetId)
          });
        } else if (
          getDistance(currentNode, targetId) < maxHeap.peek().distance &&
          currentNode !== requesterId
        ) {
          maxHeap.replace({
            nodeId: currentNode,
            distance: getDistance(currentNode, targetId)
          });
        }
      }
    }

    return maxHeap.toArray().map(entry => entry.nodeId);
  }

  function updateTreeWithIdToFind() {
    for (var i = 0; i < treeNodes.length; i++) {
      const node = treeNodes[i];
      if (node.attr("data-id") === idToFind) {
        node.fill(
          node.attr("data-id") !== idToFind
            ? idToFindTreeColor
            : treeNodeNotInGraphColor
        );
        node.stroke({ color: idToFindTreeColor, width: 2 });
        const polyline = treeCanvas.polyline("0,30 0,0 -10,15 0,0 10,15");
        polyline.fill("none").move(node.cx() - padding, node.cy() + padding);
        polyline.stroke({
          color: idToFindTreeColor,
          width: 4,
          linecap: "round",
          linejoin: "round"
        });
      }
    }
  }

  function updateGraphWithAlphaContacts() {
    alphaContactEdges.forEach(edge => edge.remove());

    graphEdges.forEach(edge => {
      const edgeClasses = edge.classes();
      for (var i = 0; i < alphaContacts.length; i++) {
        if (
          edgeClasses.includes(alphaContacts[i]) &&
          edgeClasses.includes(originNodeId)
        ) {
          const contactEdge = graphCanvas.line(
            edge.attr("x1"),
            edge.attr("y1"),
            edge.attr("x2"),
            edge.attr("y2")
          );
          contactEdge.stroke({
            color: idToFindTreeColor,
            width: 4,
            dasharray: "5,5"
          });
          alphaContactEdges.push(contactEdge);
          alphaContactEdgeGroup.add(contactEdge);
        }
      }
    });
  }

  function updateTreeWithClosestNodes() {
    for (var i = 0; i < treeNodes.length; i++) {
      const node = treeNodes[i];
      if (node.attr("data-id") !== idToFind) {
        var isClosest = false;
        closestNodes.toArray().forEach(cnode => {
          if (node.attr("data-id") === cnode.nodeId) {
            isClosest = true;
          }
        });

        if (isClosest) {
          node.fill(closestNodesColor);
          node.stroke({ color: closestNodesColor, width: 2 });
        }
      }
    }
  }

  // If `nodeToMove` is in the k-bucket, moves `nodeToMove` to tail of list.
  // Otherwise, moves first node in k-bucket to tail of list.
  function animateKBucketUpdate(svgId, nodeToMove, ownerNode, kBucketIndex) {
    if (
      !kBuckets[ownerNode][kBucketIndex].includes(nodeToMove) &&
      kBuckets[ownerNode][kBucketIndex].length === k
    ) {
      // Move first element to the tail
      nodeToMove = kBuckets[ownerNode][kBucketIndex][0];
    }

    const shapes = kBucketRects[svgId][nodeToMove];

    shapes.forEach(shape => shape.animate().attr({ opacity: 0 }));

    // Shift remaining elements to the left
    const selectedKBucket = kBuckets[ownerNode][kBucketIndex];
    var shift = false;
    for (var i = 0; i < selectedKBucket.length; i++) {
      if (shift) {
        const shapesToShift = kBucketRects[svgId][selectedKBucket[i]];
        shapesToShift.forEach(shape =>
          shape.animate().x(shape.x() - bucketWidth - padding)
        );
      }
      if (selectedKBucket[i] === nodeToMove) shift = true;
    }

    const diff =
      kBuckets[ownerNode][kBucketIndex].length -
      kBuckets[ownerNode][kBucketIndex].indexOf(nodeToMove) -
      1;
    shapes.forEach(shape =>
      shape
        .animate()
        .attr({ opacity: 1 })
        .x(shape.x() + (bucketWidth + padding) * diff)
    );
  }

  function onNodeClicked(e) {
    if (originNodeId !== "") return;
    originNodeId = e.target.getAttribute("data-id");
    document.getElementById(
      "message"
    ).innerHTML = `<p>You have selected Node <b>${originNodeId} (${bin2dec(
      originNodeId
    )})</b> to originate the lookup.</p>`;
    document.getElementById("message2").innerHTML = `
    <p>We will use system-wide parameters <b><i>k</i> = ${k}</b> and <b><i>alpha</i> = ${alpha}</b>.</p>
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
      ).innerHTML = `<p>Looking up <b>ID ${idToFind} (${bin2dec(
        idToFind
      )})</b> from <b>Node ${originNodeId}</b>.</p>`;

      updateTreeWithIdToFind();
      drawKBuckets("kbuckets", "kbuckets-title", originNodeId);
      populateAlphaContacts();
      populateLocalNodeInfo();
    }, 1000);
    // idToFind = "0b101110";
    // updateTreeWithIdToFind();
    // drawKBuckets("kbuckets", "kbuckets-title", originNodeId);
    // populateAlphaContacts();
    // populateLocalNodeInfo();
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
  updateTree();
})(this);
