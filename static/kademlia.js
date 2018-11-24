(() => {
  function dec2bin(dec) {
    return (dec >>> 0).toString(2);
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
      id;

    width = 600;
    height = 600;
    padding = 50;

    n = 15;
    deg = 0;

    nodes = [];
    while (nodes.length < n) {
      id = Math.floor(Math.random() * 256);
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

  // Initialize the DHT diagram.
  render_graph();
})(this);
