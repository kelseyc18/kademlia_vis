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

export {
  dec2bin,
  bin2dec,
  getCommonPrefixLength,
  getDistance,
  getPos,
  idsToString
};
