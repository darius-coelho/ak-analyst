import { includes } from "lodash";

/**
 * Abbreviates a number by adding K M B T etx
 * @param {string/number} value - Number to be abbreviated
 * @param {int} fixed - The maximum number of numbers after the decimal point
 */
export function abbreviateNumber(value, fixed) {
    if (value === null) {  // terminate early
        return null; 
    }    
    if (value === 0) { 
        return '0'; // terminate early
    } 
    if (value === '-inf' || value === 'inf') { 
        return value; // terminate early
    } 
    const num = +value
    fixed = (!fixed || fixed < 0) ? 0 : fixed; // number of decimal places to show
    const b = (num).toPrecision(2).split("e"), // get power
        k = b.length === 1 ? 0 : Math.floor(Math.min(b[1].slice(1), 14) / 3), // floor at decimals, ceiling at trillions
        c = k < 1 ? num.toFixed(fixed) : (num / Math.pow(10, k * 3) ).toFixed(fixed), // divide by power
        d = c < 0 ? c : Math.abs(c), // enforce -0 is 0
        e = d + ['',  'K', 'M', 'B', 'T'][k]; // append power
    return e;
  }
  
/**
 * Abbreviates a string by adding ellipsis
 * @param {string} text - The string to be abbreviated
 * @param {int} maxLen - The maximum number of characters desired before adding ellipsis
 */
export function abbreviateText(text, maxLen) {
    if (text === null) {  // terminate early
        return null; 
    }   
    let newText = text
    if(newText.length > maxLen){
        newText = newText.slice(0, maxLen) + "..."
    }
    return newText
}


/**
 * Returns a color string from a grayscale discrete color map for css style
 * @param {int} idx - An index for the grayscale value in the map
 */
export function grayScheme(idx) {
    const start = 220
    const end = 40
    const step = (start-end) / 8
    
    const grayVal = start - step*(idx%9)

    return `rgb(${grayVal}, ${grayVal}, ${grayVal})`
}


/**
 * Test if a value is within a range
 * @param {number} val - The value to be tested
 * @param {number} min - The range's lower bound
 * @param {number} max - The range's upper bound
 * @param {string} bounds - string indicating if min and max should be included or excluded in the range
 */
export function isInRange(val, min='-inf', max='inf', bounds="include") {
    if(bounds == "include") {
        const minTest = min == '-inf' || val >= min
        const maxTest = max == 'inf' || val <= max    
        return minTest && maxTest
    }
    else {
        const minTest = min == '-inf' || val > min
        const maxTest = max == 'inf' || val < max
        return minTest && maxTest
    }
    return true
}

/**
 * Test if a value is and integer and is within a range
 * @param {number} val - The value to be tested
 * @param {number} min - The range's lower bound
 * @param {number} max - The range's upper bound
 * @param {string} bounds - string indicating if min and max should be included or excluded in the range
 */
export function isInRangeInt(val, min='-inf', max='inf', bounds="include") {
    if(bounds == "include") {
        const minTest = min == '-inf' || val >= min
        const maxTest = max == 'inf' || val <= max    
        return minTest && maxTest && Number.isInteger(+val)
    }
    else {
        const minTest = min == '-inf' || val > min
        const maxTest = max == 'inf' || val < max
        return minTest && maxTest && Number.isInteger(+val)
    }
    return true
}