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
      circles,
      n,
      deg,
      group,
      group3,
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

    group = draw.group();
    group.translate(width / 2, height / 2);
    group.attr("id", "kademlia-nodes");
    group3 = draw.group();
    group3.attr("id", "kademlia-labels");

    // Create the nodes.
    circles = [];
    for (i = 0; i < n; i++) {
      // Draw node circle
      circle = draw.circle(50);
      circle.fill("#B5FFFC");
      deg += 360 / n;
      circle.cx(0).cy(-radius);
      circle.attr("transform", "rotate(" + deg + ")");
      circle.attr("node-id", nodes[i]);
      group.add(circle);
      circles.push(circle);

      var pos1 = getPos(draw.native(), circle.native());

      // Display node ID in binary
      label = draw.text(dec2bin(nodes[i]));
      label.x(pos1.x - label.native().getBBox().width / 2);
      label.y(pos1.y - 20);
      group3.add(label);

      // Display node ID in decimal
      label = draw.text("(" + nodes[i].toString() + ")");
      label.x(pos1.x - label.native().getBBox().width / 2);
      label.y(pos1.y - 2);
      group3.add(label);
    }
  }

  function render_tree() {
    var draw, height, width, circle, group, children, n, newChildren, line;

    height = 600;
    width = 600;
    padding = 10;

    draw = SVG("binary-tree");
    draw.size(height, width);

    group = draw.group();

    children = [];
    n = Math.pow(2, 6);

    // Draw leaves
    for (i = 0; i < n; i++) {
      circle = draw.circle(10);
      circle.cx((width / (n + 1)) * (i + 1));
      circle.cy(height - padding);
      group.add(circle);
      children.push(circle);
    }

    while (children.length > 1) {
      newChildren = [];
      for (i = 0; i < children.length - 1; i += 2) {
        var child1_pos = getPos(draw.native(), children[i].native());
        var child2_pos = getPos(draw.native(), children[i + 1].native());

        // Draw parent
        circle = draw.circle(10);
        circle.cx((child1_pos.x + child2_pos.x) / 2);
        circle.cy(child1_pos.y - (height - 2 * padding) / Math.log2(n));
        group.add(circle);
        newChildren.push(circle);

        var parent_pos = getPos(draw.native(), circle.native());

        // Draw edges between parent and children
        line = draw
          .line(child1_pos.x, child1_pos.y, parent_pos.x, parent_pos.y)
          .stroke({ width: 2 });
        group.add(line);
        line = draw
          .line(child2_pos.x, child2_pos.y, parent_pos.x, parent_pos.y)
          .stroke({ width: 2 });
        group.add(line);
      }
      if (newChildren.length === 1) {
        label = draw.text("0");
        label.x(
          (child1_pos.x + parent_pos.x) / 2 - label.native().getBBox().width * 2
        );
        label.y(
          (child1_pos.y + parent_pos.y) / 2 - label.native().getBBox().height
        );
        group.add(label);

        label = draw.text("1");
        label.x(
          (child2_pos.x + parent_pos.x) / 2 + label.native().getBBox().width * 2
        );
        label.y(
          (child2_pos.y + parent_pos.y) / 2 - label.native().getBBox().height
        );
        group.add(label);
      }

      children = newChildren;
    }
  }

  // Initialize the DHT diagram.
  render_graph();
  render_tree();
})(this);
