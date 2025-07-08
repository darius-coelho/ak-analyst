import * as d3 from "d3";

export const scaleType = {
  LINEAR: "LINEAR",
  TIME: "TIME",
  BAND: "BAND"
}


/** True if input is date. False o.w. */
function isDate(date) {
  if (typeof(date) === 'number')  return false;
  return (new Date(date) !== "Invalid Date") && !isNaN(new Date(date));
}

/** 
 * Returns the appropriate d3 scaleTime type 
 * augmented to handle string inputs.
 * @param {array} domain - Domain data.
 * @param {array} range - Range data.
 */
function scaleTime(domain, range) {
  let scale = d3.scaleTime()
      .domain([new Date(domain[0]), new Date(domain[domain.length-1])])
      .range(range);

  scale.type = scaleType.TIME;

  // Converts string inputs to date automatically
  let scaleWrapper = function(v) { return scale(new Date(v)); }

  // copy over the other d3 scale properties
  Object.assign(scaleWrapper, {...scale});

  return scaleWrapper;
}

/** 
 * Returns the appropriate d3 scaleBand type 
 * with the invert property added.
 * @param {array} domain - Domain data.
 * @param {array} range - Range data.
 */
function scaleBand(domain, range) {
  let scale = d3.scaleBand()
      .domain(domain)
      .range(range);
  
  scale.type = scaleType.BAND;

  scale.invert = function(r) {
    var eachBand = scale.step();
    var index = Math.round((r / eachBand));
    return scale.domain()[index];
  }

  return scale;
}

/** 
 * Returns the appropriate d3 scaleLinear type.
 * @param {array} domain - Domain data.
 * @param {array} range - Range data.
 */
function scaleLinear(domain, range) {
  let scale = d3.scaleLinear()
      .domain([d3.min(domain), d3.max(domain)])
      .range(range);

  scale.type = scaleType.LINEAR;
  
  return scale;
}


/** 
 * Returns the appropriate d3 scale type 
 * based on the data.
 * @param {array} domain - Domain data.
 * @param {array} range - Range data.
 */
export function selectScale(domain, range) {
  if (isDate(domain[0])) 
    return scaleTime(domain, range);

  if (typeof(domain[0]) === "string") 
    return scaleBand(domain, range);

  return scaleLinear(domain, range);
}
