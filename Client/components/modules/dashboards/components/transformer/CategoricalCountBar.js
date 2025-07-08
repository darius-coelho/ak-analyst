import React, { useState, useEffect, useRef } from 'react';
import { abbreviateNumber } from '../../../utilities/utilities';
import InfiniteScroll from "react-infinite-scroll-component";
import * as d3 from "d3";

import "../../../../css/Core.css"
import "./css/CategoricalCountBar.css"

/**
 * Renders a horizontal bar with a label.
 * @param {number} labelWidth - Width of the category label. 
 * @param {string} catName - The category name or label.
 * @param {number} valFilt - The value of the bar (count) that falls within the filter.
 * @param {number} valAll - The value of the bar (count) for all data.
 * @param {function} xAx - scaling function to determine the width of the bar. 
 * @param {boolean} isSelected - A flag indicating if the current bar is selected
 * @param {function} onTransform - Function to handle the change name transform.
 */
const HorizontalBar = (props) => {
  const { labelWidth, catName, valFilt, valAll, xAx, isSelected, onTransform } = props

  const inputRef = useRef(null);

  const [newName, setNewName] = useState(catName)
  const [showNameEdit, setShowNameEdit] = useState(false)

  // Forwared escape key press to rename function
  useEffect(() => {
    function onKeyupInput(e) {
      if (e.key === 'Escape') onRename(e)
    }
    const inputEl = inputRef.current;
    inputEl.addEventListener('keyup', (onKeyupInput));
    return () => {
      inputEl.removeEventListener('keyup', onKeyupInput);
    }
  }, []);

  // Focus text edit when it is shown
  useEffect(() => {
    if (showNameEdit) {
      inputRef.current.focus();
    }
  }, [showNameEdit]);

  /**
   * Sets temporary name for the attribute until it is applied.
   * @param {object} evt - Input event object.
   */
  const onChangeNewName = (evt) => {
    setNewName(evt.target.value)
  }

  /**
   * Changes list name to newName on enter otherwise resets newName to name.
   * Then hides the text input
   * @param {object} evt - Input event object.
   */
  const onRename = (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (catName != newName && newName.trim().length > 0) {
        onTransform({
          tType: "Repl",
          old_vals: [catName],
          new_val: newName
        });
      }
      setShowNameEdit(false)
      inputRef.current.blur();
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      inputRef.current.blur();
      setNewName(catName)
      setShowNameEdit(false)
    }
  }

  /**   
   * Shows the text input uses to ranme a pattern
   * @param {object} evt - Input event object.
   */
  const onShowNameEdit = (evt) => {
    evt.preventDefault()
    evt.stopPropagation()
    setShowNameEdit(true)
  }

  /**
   * Resets newName to name when clicking outside the text box and hides text input.
   */
  const onBlurNewName = () => {
    setNewName(catName)
    setShowNameEdit(false)
  }


  const dataPerc = 100 * valFilt / valAll
  const dataTitle = valFilt == valAll
    ? valAll
    : `${valFilt} (of ${valAll}) or ${abbreviateNumber(dataPerc, 3)}%`

  // Props common to the full and filtered bars.
  const rectDivProps = {
    style: {
      display: 'inline-block',
      width: xAx(valAll),
      height: 17,
      background: `linear-gradient(90deg, ${isSelected ? '#f5ab71': '#4682b4'} ${dataPerc}%, #b3b3b3 ${0}%)`,
      verticalAlign: "middle"
    },
    title: catName + ": " + dataTitle
  };

  const textDivProps = {
    style: {
      display: !showNameEdit ? 'inline-block' : 'none',
      width: labelWidth,
      padding: "0px 5px",
      textAlign: "right",
      fontSize: 14,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      verticalAlign: "middle"
    },
    title: catName
  };


  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        className="coreTextInput"
        value={newName}
        style={{ display: showNameEdit ? 'inline-block' : 'none', margin: 0, width: labelWidth - 5, verticalAlign: "middle" }}
        onClick={(e) => e.stopPropagation()}
        onChange={onChangeNewName}
        onKeyPress={onRename}
        onBlur={onBlurNewName}
      />
      <div {...textDivProps} onDoubleClick={onShowNameEdit}>
        {catName}
      </div>
      <div {...rectDivProps} ></div>
    </div>
  );
}

/**
 * Renders a horizontal bars for two sets of data (i.e. filtered and full data).
 * @param {number} width - Width of the plot. 
 * @param {number} labelWidth - Width of the category label. 
 * @param {number} padding - padding on the left and right of the plot.
 * @param {object} dataFilt - JSON mapping attribute to count for filtered data.
 * @param {object} dataAll - JSON mapping attribute to count for all data.
 * @param {array} categories - list of categories with the selected categories at the start. 
 * @param {number} nSelected - The number of selected attributes.
 * @param {function} onTransform - Function to handle the change name transform.
 */
const CountBars = (props) => {
  const { width, padding, labelWidth, dataFilt, dataAll, categories, nSelected, onTransform } = props;

  const [previewCats, setPreviewCats] = useState([]);

  useEffect(() => {
    setPreviewCats(categories.slice(0, 20));
  }, [categories]);

  // x-scale mapping count to pixel width
  const xAx = d3.scaleLinear()
    .domain([0, d3.max(Object.values(dataAll))])
    .range([0, width - labelWidth - padding])

  /** Updates the attributes list. */
  function fetchMoreData() {
    setPreviewCats(previewCats.concat(categories.slice(previewCats.length, previewCats.length + 20)));
  }

  return (
    <InfiniteScroll
      dataLength={previewCats.length}
      next={fetchMoreData}
      hasMore={previewCats.length < categories.length}
      loader={<h4>Loading...</h4>}
      scrollableTarget="catBarList" >
      {
        previewCats.map((cat, index) =>
          <HorizontalBar
            key={`cat-bar-${index}-${cat}`}
            catName={cat}
            labelWidth={labelWidth}
            valAll={dataAll[cat]}
            valFilt={dataFilt[cat]}
            xAx={xAx}
            isSelected={index < nSelected}
            onTransform={onTransform}
          />
        )
      }
    </InfiniteScroll>
  );
}

/**
 * Renders a horizontal bar chart for two sets of data (i.e. filtered and full data).
 * @param {number} width - Width of the plot. 
 * @param {number} height - Height of the plot. 
 * @param {number} padding - padding for the plot.
 * @param {array} border - Array of the category names within the filter.
 * @param {array} counts - Array of the counts corresponding to category names within the filter.
 * @param {array} borderAll - Array of the category names for all the data.
 * @param {array} countsAll - Array of the counts corresponding to category names for all the data.
 * @param {array} selected - List of selected categories.
 * @param {function} onTransform - Function to handle the change name transform.
 */
const CategoricalCountBar = (props) => {

  const { counts, border, countsAll, borderAll, selected, onTransform,
          width, height, padding } = props

  const vPad = 15

  const ht = borderAll.length * 25 + 2 * vPad;
  const minHt = 50 + 2 * vPad;

  // Create JSON mapping category to count for all data
  const dataAll = Object.assign({}, ...borderAll.map((d, i) => ({ [d]: countsAll[i] })));
  const dataFilt = {
    ...Object.assign({}, ...borderAll.map((d, i) => ({ [d]: 0 }))),
    ...Object.assign({}, ...border.map((d, i) => ({ [d]: counts[i] })))
  }
  
  const categories = [
    ...selected,
    ...borderAll.filter(d => !selected.includes(d))
  ]

  const barHolderStyle = {
    width: width - 5,
    height: Math.max(Math.min(height - 50, ht), minHt),
    overflowY: "auto"
  };

  return (
    <div>
      <div className='catLegendHolder'>
        <div className='catLegendRect' style={{ background: "#4682b4" }}></div>
        <label className='catLegendLabel'>Filtered Points</label>
        <div className='catLegendRect' style={{ background: "#b3b3b3" }}></div>
        <label className='catLegendLabel'>All Points</label>        
      </div>
      <div id='catBarList' style={barHolderStyle}>
        <CountBars
          width={width}
          padding={padding}
          labelWidth={100}
          categories={categories}
          dataFilt={dataFilt}
          dataAll={dataAll}
          nSelected={selected.length}
          onTransform={onTransform} />
      </div>
    </div>
  );
}

export default CategoricalCountBar