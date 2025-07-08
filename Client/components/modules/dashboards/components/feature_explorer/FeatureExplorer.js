import React, { useState, useEffect, useRef, useContext } from 'react';
import { useHistory } from 'react-router-dom';
import { ContextMenuTrigger, ContextMenu, MenuItem } from "react-contextmenu";
import AddressContext from "../../../../AddressContext";
import axios from "axios";

import * as d3 from 'd3';

import ToggleButton from 'react-bootstrap/ToggleButton';
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ButtonToolbar from 'react-bootstrap/ButtonToolbar'
import { Link } from 'react-router-dom';

import mixpanel from 'mixpanel-browser';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import { downloadChart } from '../../../common/components/downloadChart';

import { useInfoToastContext } from '../../../common/components/InfoToastContext';

import "../../../../css/Core.css"
import "../../../../css/Charts.css"

/** 
 * Renders a minimap of the feature bar plots.
 * @param {array} data - array containing json with label and value keys.
 * @param {int} width - Width of the plot.
 * @param {int} height - Height of the plot.
 * @param {float} xmin - Min value for the 'value' key.
 * @param {float} xmax - Max value for the 'value' key.
 */
function HorizontalMiniMap(props) {
  const {data, width, height, xmin, xmax} = props;
  
  const xScale = d3.scaleLinear()
	.domain([xmin, xmax])
	.range([0, width]);

  const yScale = d3.scaleBand()
	.domain(data.map(d=>d.label))
	.paddingInner(0.2)
	.range([10, height-10]);
  
  return data.map((d, index) => {
    const rectProps = {
      x: 0,
      y: yScale(d.label),
      height: yScale.bandwidth(),
      width: xScale(d.value)
    };

    const lineProps = {
      x1: 0,
      x2: width,
      y1: yScale(d.label),
      y2: yScale(d.label),
      stroke: "black",
      strokeDasharray: 5    
    };


    return (
      <g key={`g-${index}`}>
	{
	  (index > 0 && data[index-1].ndims < d.ndims)
	    ? <line {...lineProps} />
	    : null
	}
	<rect  {...rectProps} className={"dataContextItem"} />
	</g>
    );
  });
}

/**
 * Renders a SVG Text within a surrounding svg rectange.
 * @param {string} label - Text that should be written.
 * @param {string} title - Title text on hover.
 * @param {int} fontSize - Font size in pixels.
 * @param {int} width - Width of the surrounding box.
 * @param {int} height - Height of the surrounding box.
 * @param {string} fill - Color to fill the box.
 */
function SVGTextBox(props) {
  const { label, title, fontSize, x, y, width, height, fill } = props;
  const textProps = {
    x: x + 5,
    y: y + 13,
    fontSize
  };

  const boxProps = {
    x: x,
    y: y,
    width,
    height,
    fill: fill, // "#a1d2fd",
    stroke: (fill==="white" ? "black" : "none"),
    rx: 5,
  };
  
  return (
    <g>
      <rect {...boxProps}></rect>
      <text {...textProps}>
        <title>{title}</title>
        {label}
      </text>
    </g>
  );
}

/**
 * Renders a cross-product of text boxes.
 * @param {array} labels - Array of text to write.
 * @param {int} fontSize - Font size in pixels.
 * @param {int} xstart - Starting location of the bars.
 * @param {int} y - Y-location to draw boxes at.
 * @param {int} height - Height of the boxes.
 * @param {string} fill - Color to fill the box.
 */
function  SVGTextBoxCross(props) {
  const {labels, fontSize, xstart, y, height, fill } = props;

  const measure = (data) => {
    // create a mock element
    let newText = document.createElement("text");
    newText.setAttribute("id", data.id);
    document.body.appendChild(newText);

    // append text data
    let theTextEle = document.getElementById(`${data.id}`);
    theTextEle.innerHTML += data.str;

    // append text font / size, bc might as well be fancy
    //theTextEle.style.fontFamily = data.fontFamily;
    theTextEle.style.fontSize = `${data.fontSize}px`;

    // measure element
    let width = theTextEle.getBoundingClientRect().width;
    let height = theTextEle.getBoundingClientRect().height;

    // delete element
    theTextEle.parentNode.removeChild(theTextEle);

    // set data
    let dimData = [width, height];
  
    // return dimension data
    return dimData;
  };

  let totalLen = xstart;
  let maxChar = 20;
  let labelData = null;
  while (totalLen >= xstart-10 && maxChar > 5) {
    maxChar = Math.max(3, maxChar-5);
    
    labelData = labels.map((text, i)=>{
      const labelText = (String(text).length <= maxChar
			 ? String(text)
			 : String(text).slice(0, Math.max(1, maxChar - 5)) + "...");
      
      const txtDims = measure({fontSize: fontSize, str: labelText, id: i});
      return {
	label: labelText,
	title: text,
	width: txtDims[0],
	height: txtDims[1],
      };
    });

    // Length for each text plus the crosses
    totalLen = labelData.reduce((agg, val)=>agg+val.width, 0) + (labelData.length-1) * 20;
  }  // end while
  
  return labelData.map((data, i)=>{
    const priorData = labelData.filter((ld, li) => li < i);
    const startPos = priorData.reduce((agg, val)=>agg+val.width, 0) + (priorData.length) * 20;

    const txtBoxProps = {
      x: xstart - totalLen + startPos - 15,
      y: y,
      width: data.width + 10,
      height: height,
      label: data.label,
      title: data.title,
      fill: fill,
      fontSize,
    };

    const linePropsLR = {
      x1: txtBoxProps.x + txtBoxProps.width + 2,
      x2: txtBoxProps.x + txtBoxProps.width + 8,
      y1: y+6,
      y2: y+height-6,
      stroke: "gray",      
    }

    const linePropsRL = {
      x1: txtBoxProps.x + txtBoxProps.width + 8,
      x2: txtBoxProps.x + txtBoxProps.width + 2,
      y1: y+6,
      y2: y+height-6,
      stroke: "gray",      
    }

    if (i === labelData.length - 1) {
      return (
	  <g key={`g-${i}`}><SVGTextBox {...txtBoxProps} /></g>
      );
    }

    return (
	<g key={`g-${i}`}>
	<SVGTextBox {...txtBoxProps} />
	<line {...linePropsLR} />
	<line {...linePropsRL} />
      </g>
    );
    
  });
}

/**
 * Plots a horizontal bar chart.
 * @param {array} data - array containing json with label and value keys.
 * @param {int} width - Width of the plot.
 * @param {int} height - Height of the plot.
 * @param {json} padding - left, right, top and bottom padding.
 * @param {int} startY - Y-position to start the plot at.
 * @param {float} xmin - Min value for the 'value' key.
 * @param {float} xmax - Max value for the 'value' key.
 * @param {int} barH - Bar height in pixels.
 */
function HorizontalBarChart(props) {
  const { data, width, height, padding, startY, xmin, xmax,
	  barH, xstart, selected, toggleSelected } = props;
  
  const xScale = d3.scaleLinear()
	.domain([xmin, xmax])
	.range([padding.left, width - padding.right - xstart]);


  const measure = (data) => {
    // create a mock element
    let newText = document.createElement("text");
    newText.setAttribute("id", data.id);
    document.body.appendChild(newText);

    // append text data
    let theTextEle = document.getElementById(`${data.id}`);
    theTextEle.innerHTML += data.str;

    // append text font / size, bc might as well be fancy
    //theTextEle.style.fontFamily = data.fontFamily;
    theTextEle.style.fontSize = `${data.fontSize}px`;

    // measure element
    let width = theTextEle.getBoundingClientRect().width;
    let height = theTextEle.getBoundingClientRect().height;

    // delete element
    theTextEle.parentNode.removeChild(theTextEle);

    // set data
    let dimData = [width, height];

    // return dimension data
    return dimData;
  };

  return data.map((d, index) => {
    const rectProps = {
      x: xstart,
      y: padding.top + startY + index * barH,
      height: barH - 6,
      width: xScale(d.value)
    }
    
    const labelText = (String(d.label).length <= 20
		       ? String(d.label)
		       : String(d.label).slice(0, 15) + "... ")
    
    const txtDims = measure({fontSize: 12, str: labelText, id: index});
    const textProps = {
      x: xstart - txtDims[0] - 10,
      y: padding.top + startY + index * barH + 13,
      // textAnchor:"end",
      fontSize: 12,
    };
    
    const borderProps = {
      x: xstart - txtDims[0] - 15,
      y: padding.top + startY + index * barH, // + 9 - 5,
      width: txtDims[0] + 10,
      height: barH - 6,
      fill: 'none',
      stroke: 'black'
    };

    const txtBoxProps = {
      x: xstart - txtDims[0] - 15,
      y: padding.top + startY + index * barH,
      width: txtDims[0] + 10,
      height: barH - 6,
      label: labelText,
      title: d.label,
      fontSize: 12,
    };

    const txtBoxCrossProps = {
      labels: d.attrs,
      xstart: xstart,
      y: padding.top + startY + index * barH,
      height: barH - 6, 
      fontSize: 12,
      fill: (selected.filter(e=>e.toString() === d.attrs.toString()).length == 0
	     ? "white"
	     : "#a1d2fd")
    }
    
    return (
	<g key={`gtxt-${index}`} cursor={'pointer'} onClick={()=>toggleSelected(d.attrs)}>
	<SVGTextBoxCross key={`svgtxt-${index}`} {...txtBoxCrossProps} />
        <rect key={`all-${index}`} {...rectProps} 
                className={"dataContextItem"} >
          <title>{d.label + ": " + d.value}</title>
        </rect>
       </g>
     );
  });
}

/**
 * Renders a button which toggles whether to show an interaction features.
 * @param {string} label - Button label.
 * @param {int} value - Indicates the level of interaction (e.g. Main, 2-way, etc.)
 * @param {fun} onClick - Handles when the button is clicked.
 */
function InteractionButton(props) {
  const { label, value, onClick } = props;
  const [checked, setChecked] = useState(true);

  const styles = {
    padding: '5px',
    fontSize: '13px',
    width: '50px'
  };

  /** Handles when button has been clicked. */
  const onChange = (e) => {
    onClick(value)
    setChecked(e.currentTarget.checked);
  }
  
  return (
      <ToggleButton
        className="mb-2"
        id={`toggle-check-${label}`}
        type="checkbox"
        variant="outline-secondary"
        checked={checked}
        value={value}
        onChange={onChange}
        style={styles}
      >
      {label}
    </ToggleButton>
  );  
}

/** 
 * Renders the menu of interaction buttons.
 * @param {int} titleHeight: Height for the "Interactions" label.
 * @param (int) menuHeight: Height of the menu.
 * @param {int} maxInteract: Max. number of interactions.
 * @param {fun} toggleExclude: Toggles the display of interactions when clicked.
 */
function InteractionMenu(props) {
  const { titleHeight, menuHeight, maxInteract, toggleExclude } = props;
  const style = {
    height: menuHeight,
    backgroundColor: '#ffffff',
    boxShadow: '0px 0px 1px 1px #9a9a9a',
    borderRadius: '2px',
    padding: 10,
    marginTop: 10,
    marginRight: 10,
  };
  
  return (
      <div style={style}>
      <Row>
      <ButtonToolbar>
      <ButtonGroup className="mb-2">
      <Col className='m-1'>
        <label style={{fontSize: '14px', padding: 5, height: titleHeight}}>Interactions:</label>
      </Col>
      {
	[...Array(maxInteract).keys()].map(dim=>{
	  if (dim === 0)	    
            return (
		<Col key={dim} className="m-1">
		  <InteractionButton label={'Main'} value={dim+1} onClick={toggleExclude} />
		</Col>
	    );
	  
          return (
	      <Col key={dim} className="m-1">
	        <InteractionButton label={`${dim+1}-way`} value={dim+1} onClick={toggleExclude}/>
	      </Col>
	  );
	})
      }
      </ButtonGroup>
      </ButtonToolbar>
      </Row>
      </div>					  
  );
}

/**
 * Renders the dotted-line and text dividing the interactions.
 * @param {string} txt - Text to render.
 * @param {json} padding - left, right, top, and bottom padding.
 * @param {int} startY - Y-position to start the plot at.
 * @param {int} width - Width of the plot.
 */
function EffectHeaderLine(props) {
  const { txt, padding, startY, width } = props;
  const lineProps = {
    x1: padding.left,
    x2: width-padding.right,
    y1: startY+3,
    y2: startY+3,
    stroke: "black",
    strokeDasharray: 5    
  };
  
  return (
      <g>
        <text x={padding.left} y={startY} fontSize={11}>{txt}</text>
        <line {...lineProps} />
      </g>
  );
}

/** 
 * Renders a batch of feature scores corresponding to an interaction effect.
 * @param {array} data - array containing json with label and value keys.
 * @param {json} padding - left, right, top and bottom padding.
 * @param {int} width - Width of the plot.
 * @param {int} height - Height of the plot.
 * @param {int} startY - Y-position to start the plot at.
 * @param {string} txt - Text to render.
 * @param {float} xmin - Min value for the 'value' key.
 * @param {float} xmax - Max value for the 'value' key.
 * @param {int} barH - Bar height in pixels.
 */
function EffectPlot(props) {
  const { data, padding, width, height, startY, txt, xmin, xmax,
	  barH, maxDims, selected, toggleSelected } = props;

  const xstart = padding.left + Math.max(0.075 * window.innerWidth, 65*maxDims);
  return (
      <g>
      <EffectHeaderLine {...{txt, padding, startY, width}} />
      <HorizontalBarChart
        startY={startY}
        xstart={xstart}
        width={width}
        height={height}
        data={data}
        padding={padding}
        xmin={xmin}
        xmax={xmax}
        barH={barH}
        selected={selected}
        toggleSelected={toggleSelected}
      />
      </g>
  );
}


/**
 * Renders the feature scores corresponding to the main + interaction effects.
 * @param {array} plotData - array containing json with label and value keys.
 * @param (int) maxDims - Max. number of features + interactions.
 * @param {json} padding - left, right, top and bottom padding.
 * @param {int} width - Width of the plot.
 * @param {float} xmin - Min value for the 'value' key.
 * @param {float} xmax - Max value for the 'value' key.
 * @param {int} barH - Bar height in pixels.
 */
function InteractionFeaturePlot(props) {
  const { plotData, maxDims, padding, width, xmin, xmax,
	  barH, selected, toggleSelected } = props;
  return [...Array(maxDims).keys()].map(dim=>{
    const data = plotData.filter(d=>d.ndims===dim+1);
    
    if (data.length == 0)
      return null;
	  
    const dimHeight = data.length * barH + padding.top + padding.bottom;
    const pHeight  = plotData.filter(d=>d.ndims <= dim).length * barH
	  + dim*(padding.top + padding.bottom);
	  
    const startY = (dim > 0 ? pHeight : 0) + padding.top + 3;
    const txt = (dim==0 ? 'Main' : `${dim+1}-way interaction`);
    
    return (
	<EffectPlot key={`ep-${dim}`}
          data={data}
          startY={startY}
          width={width}
          height={dimHeight}
          padding={padding}
          txt={txt}
          xmin={xmin}
          xmax={xmax}
          barH={barH}
          maxDims={maxDims}
          selected={selected}
          toggleSelected={toggleSelected}
	/>
    );
  });
}

/**
 * Renders the Feature score bar chart panel on the left.
 * @param {array} plotData - array containing json with label and value keys.
 * @param {json} padding - left, right, top and bottom padding.
 * @param {int} pad - CSS padding size.
 * @param {int} margin - CSS margin size.
 * @param {int} height - Height of the panel.
 * @param {int} width - Width of the panel.
 * @param {int} titleHeight - Height of the title at the top left.
 * @param {int} barH - Bar height in pixels.
 * @param {int} menuHeight - Height of the interaction selection menu.
 * @param {int} totalDims - Total number of interaction levels.
 * @param {array} selected - List of selected features (interactions).
 * @param {fun} toggleExclude - Handler for clicking on a button in the menu.
 * @param {fun} toggleSelected - Handler for clicking on a feature / interaction.
 * @param {fun} onScroll - Handler which is called on scroll.
 */
function InteractionFeaturePanel(props) {
  const { plotData, padding, pad, margin, height, width, titleHeight, barH,
	  menuHeight, totalDims, selected, toggleExclude, toggleSelected, onScroll } = props;

  const xmin = d3.min(plotData, (d) => d.value);
  const xmax = d3.max(plotData, (d) => d.value);

  const contentHeight = window.innerHeight
	- titleHeight
	- margin  // interaction menu margin top
	- menuHeight
	- 2*margin;  // margin top + bottom for the panel

  // max interaction level (possibly from filtered)
  const maxDims = d3.max(plotData, (d) => d.ndims);
  
  const svgWidth = width - 4 * pad - 2 * margin;
  const svgHeight = plotData.length * barH + (maxDims) * (padding.top + padding.bottom) + 50;
  
  const featureExplorerStyles = {
    overflow: 'hidden',
    padding: pad,
    margin: margin,
    height: height,
    width: width
  };

  const barChartStyles = {
    padding: pad,
    margin: margin,
    overflow: 'auto',
    height: contentHeight
  };  

  const onDownloadChart = (e) => {      
    const fname = `features.png`
    downloadChart(1, fname, ".featureExplorer")    
  }
  
  return (
      <div className="contentdiv" style={featureExplorerStyles}>
        <ContextMenu id="svg_context_menu">
          <MenuItem onClick={onDownloadChart}>
            Save
          </MenuItem>
          <MenuItem>
            Cancel
          </MenuItem>
        </ContextMenu>
        <label className="contentDivHead" title={"Feature Explorer"}>Feature Explorer</label>
        <InteractionMenu
          titleHeight={titleHeight}
          menuHeight={menuHeight}
          maxInteract={totalDims}
          toggleExclude={toggleExclude}
        />
        <div style={barChartStyles} onScroll={onScroll}>
          <ContextMenuTrigger id="svg_context_menu" renderTag="div">
          <svg className='featureExplorer' width={svgWidth} height={svgHeight}>
            <InteractionFeaturePlot 
              width={svgWidth} 
              {...{
                plotData,
                maxDims,
                padding,
                xmin,
                xmax,
                barH,
                selected,
                toggleSelected
              }}
            />
          </svg>
          </ContextMenuTrigger>
        </div>
      </div>
  );
}

/**
 * Renders the FeatureExplorer component
 * @param {array} scores - array of containing the pair (features, score)
 * @param {json} execData - Dependence data for the current action.
 */
export default function FeatureExplorer(props) {
  // Get react router manipulator
  const history = useHistory();
  
  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  
  const { scores, execData } = props;

  // offset for the minimap box
  const offset = useRef();

  // reference to the loading screen
  const loaderRef = useRef();
  
  // list of interaction levels to exclude from the display
  const [exclude, setExclude] = useState([]);

  // list of feature interactions to include for the pattern browser
  const [selected, setSelected] = useState([]); //scores.map(s=>s[0]));

  const plotData = scores.filter(d=>!exclude.includes(d[0].length)).map((d)=>{
    const key = d[0].reduce((agg, val)=>{
      if (agg) {
	return agg + ' x ' + val;
      }
      return val;
    }, '');

    return {label: key, value: d[1], ndims: d[0].length, attrs: d[0]};
  });

  useEffect(()=>{
    mixpanel.track("Page View", {'name': 'feature_explorer'});
  }, []);
  
  useEffect(()=>{
    setSelected(plotData.filter(d=>JSON.stringify(selected).includes(JSON.stringify(d.attrs)))
		.map(d=>d.attrs))
  }, [exclude]);

  const xmin = d3.min(plotData, (d) => d.value);
  const xmax = d3.max(plotData, (d) => d.value);

  // max interaction level (possibly from filtered)
  const maxDims = d3.max(plotData, (d) => d.ndims);

  // max interaaction level (unfiltered)
  const totalDims = d3.max(scores, (d) => d[0].length);

  const hpad = 10, vpad = 20;
  const titleHeight = 30;
  const menuHeight = 55;
  const barH = 25; // bar height
  const margin = 10;
  const pad = 10;
  
  const padding = {
    left: hpad,
    right: hpad,
    top: vpad,
    bottom: vpad
  };

  const contentHeight = window.innerHeight
	- titleHeight
	- margin  // interaction menu margin top
	- menuHeight
	- 2*margin;  // margin top + bottom for the panel
  
  const featureWidth = 0.70 * window.innerWidth;
  const optionsWidth = 0.28 * window.innerWidth;
  const height = contentHeight + menuHeight + titleHeight;

  const svgHeight = plotData.length * barH + (maxDims) * (padding.top + padding.bottom) + 50;
  const minimapSvgHeight = height
	- 41  // hr + padding
	- 50  // button menu height
	- 15  // button menu margin
	- 30  // title height
	- 20; // padding top and bottom

  const scrollScale = d3.scaleLinear()
	.domain([0, svgHeight])
	.range([0, minimapSvgHeight]);
  
  /** Detects scroll event and updates the minimap */
  const onScroll = (event) => {
    const scrollTop = event.currentTarget.scrollTop;
    const scrollBottom = event.currentTarget.scrollBottom;
    offset.current.style.transform = `translateY(${scrollScale(scrollTop)}px)`;
  }

  /**
   * Adds / removes val from the exclude list.
   * @param {int} val -  Value to add / remove.
   */
  const toggleExclude = (val) => {
    const filt = exclude.filter(e=>e!=val);    
    if (filt.length === exclude.length) {
      // val is not in the the exclude list
      setExclude(exclude.concat(val))  // so add it
    } else {  // val is in the exclude list
      setExclude(filt)  // so remove it
    }    
  }

  /** 
   * Adds / removes attribute interactions from the selected list.
   * @param {int} val - List of values to add / remove.
   */
  const toggleSelected = (val) => {
    const filt = selected.filter(e=>e.toString() != val.toString());    
    if (filt.length === selected.length) {
      // val is not in the the selected list
      setSelected(selected.concat([val]))  // so add it
    } else {  // val is in the selected list
      setSelected(filt)  // so remove it
    }    
  }

  /** Sets the loading screen */
  const setLoadingScreen = () => {
    loaderRef.current.style.display = 'block';
  }
  
  const optionsStyles = {
    left: featureWidth + margin,
    height: height,
    margin: margin,
    padding: pad,
    width: optionsWidth,
  };

  const viewPortBox = {
    width: optionsWidth,
    height: Math.min(scrollScale(minimapSvgHeight + 2*barH), contentHeight),
    x: 0,
    y: 0, 
    fill: "gray",
    opacity: 0.25
  }

  const svgWidth = featureWidth - 4 * pad - 2 * margin;

  /** Launches the pattern browser with selected attributes. */
  function onLaunchBrowser(event) {
    const target = execData.input[0].config.target;
    const targetType = execData.input[0].config.mineType;

    // set the selected interactions to mine for
    const data = {'interactions': selected}
    
    const endPoint = context.address + "LaunchBrowserFE";

    setLoadingScreen();
    
    axios.post(endPoint, data, {withCredentials: true})
      .then((response) => {
        if(Object.keys(response.data.patterns).length > 0){
          // If patterns were found
          // Route to pattern browser component with appropriate props             
          history.push({
            pathname: "/pattern-browser", 
            state: {
              target: target,
              targetType: targetType,
              patterns: response.data.patterns,    
              features: response.data.features,
              defaultSummary: response.data.summary,
              selectedSummary: response.data.summary,
              catLabels: response.data.catLabels,
              patternsLoaded: true,
	      prevProps: props,
            }
          });          
          // props.setOutput({errMsg: ""});
        }
        else{
          // Show Error in output
          console.log("No patterns")
        }          
      })
      .catch(error => {
	      console.log(error);
        const errRes = error.response.data
        props.handleNodeError(errRes.nodeID, errRes.action_type, errRes.err)
        addInfoToast(error.response.data.err, 'danger');
      });  
  }  // end onLaunchBrowser
  
  return (
    <div>
      <InteractionFeaturePanel {...{
        plotData,
        padding,
        pad,
        margin,
        height,
        width: featureWidth,
        titleHeight,
        barH,
        menuHeight,
        totalDims,
        selected,
        toggleExclude,
        toggleSelected,
        onScroll
      }} />
      <div className="contentdiv" style={optionsStyles}>
        <label className="contentDivHead" title={"Options"} style={{height: 30}}>Options</label>
        <div style={{display: "flex", justifyContent: "center", marginTop: '15px'}}>
          <button className="coreButton" onClick={onLaunchBrowser}> Launch Pattern Browser </button>
          <Link to={{pathname: "/main"}} className="coreButton">{"Exit"}</Link>
        </div>
        <hr style={{margin: '20px 0'}}/>
        <svg width={optionsWidth-2*pad} height={minimapSvgHeight}>
          <HorizontalMiniMap
            data={plotData.sort((a,b)=>a.ndims-b.ndims)}
            width={optionsWidth - 2*pad}
            height={minimapSvgHeight}
            xmin={xmin} xmax={xmax}
          />
          <rect {...viewPortBox} ref={offset} />
        </svg>
      </div>
      <div ref={loaderRef} className="loaderContainer" style={{display: "none"}}>
        <div className="loaderBarA" style={{top: "40%"}}/>
      </div>
    </div>
  );
}
