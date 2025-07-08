import React, { useState, useEffect } from 'react';

import Form from 'react-bootstrap/Form';
import { Slider } from '@material-ui/core'

import MultiAttributeSelect from '../../../common/components/MultiAttributeSelect';
import { abbreviateNumber } from '../../../utilities/utilities';

import './css/PatternListFilter.css'

/**
 * Renders sort button 
 * If sorting is applied then it higlights the button 
 * and indicates the direction of the sort with an arrow
 * @param {string} dim - The dimension sorted on
 * @param {label} label - The button label/display text
 * @param {json} sort - Json containing the dimension and direction of the current list sort
 * @param {function} onChangeSort - Function to sort a pattern list
 */
const SortButton = (props) => {
  const { dim, label, sort, onChangeSort } = props

  // Check if sorting is applied and update direction indicator
  let indicator = null
  if(sort.dim == dim && sort.direction == 'asc'){
    indicator = <span style={{marginLeft: 2}}>&#8593;</span>
  }
  if(sort.dim == dim && sort.direction == 'desc'){
    indicator = <span style={{marginLeft: 2}}>&#8595;</span>
  }

  return (
    <div
      className='coreButtonSmall'
      style={{fontSize: '9pt', boxShadow: indicator == null ? null : "0px 0px 3px 2px #153453"}}
      onClick={() => onChangeSort(dim)}>
        {label}
        {indicator}
    </div>
  )
}

/**
 * Renders filter controls to sort and filter a pattern list
 * @param {string} targetType - the type of target mined - numeric or binary
 * @param {int} listId - The index of pattern list to which the filters will be applied
 * @param {json} listId - The filters object that stores the filter parameters
 * @param {list} attributes - A list of attributes in the dataset
 * @param {function} sortList - Function to set filters on a pattern list
 * @param {function} changeFilter - Function to sort a pattern list
 */
const PatternListFilter = (props) => {

  const { target, targetType, listId, filters, changeFilter, sortList, attributes } = props

  if(filters == null) {
    return null
  }

  /**
   * Function to sort the current pattern list
   * @param {list} dim - The dimension to sort by - stat(mu or prob) or size
   */
  const onChangeSort = (dim) => {
    sortList(listId, dim);
  }

  /**
   * Function to set a slider range for a numerical filter
   * @param {list} filterDim - The dimension to set the filter on - stat, size, or numCore
   * @param {list} newValue - 2 item list containing the lower and upper bound of the filter
   */
  const handleChangeSlider = (filterDim, newValue) => {
    changeFilter(listId, {
      ...filters,
      [filterDim]: {
        ...filters[filterDim],
        selected: newValue
      },
    });
  };

  /**
   * Function to set a slider range for a numerical filter
   * @param {list} filterDim - The dimension to set the filter on - stat, size, or numCore
   * @param {list} newValue - 2 item list containing the lower and upper bound of the filter
   */
   const handleChangeSliderStat = (newValue) => {
    changeFilter(listId, {
      ...filters,
      'stat': {
        ...filters.stat,
        [target]: {
          ...filters.stat[target],
          selected: newValue
        }
      },
    });
  };

  /**
   * Function to filter by core features
   * @param {list} value - The list containing list of attributes that must be part of the patterns core attributes
   */
  const changeFeatures = (values) => {
    changeFilter(listId, {
      ...filters,
      features: values.map(d => d.value)
    });
  } 

  const [showFilters, setShowFilters] = useState(false)
  const toggleShowFilters = () => setShowFilters(!showFilters)

  // Labels for the sliders
  const sliderSizeMarks = [
    { value: 0, label: '0%' },
    { value: 100, label: '100%' }
  ]
  const sliderStatMarks = [
          { value: filters.stat[target].domain[0], label: filters.stat[target].domain[0].toFixed(1) },
          { value: filters.stat[target].domain[1], label: filters.stat[target].domain[1].toFixed(1) }
        ]

  const sliderStatValueFormat = targetType == 'numeric'
                          ? (d) => abbreviateNumber(d, 2)
                          : (d) => abbreviateNumber(d*100, 2)

  const sliderNumCoreMarks = [
    { value: filters.numCore.domain[0], label: filters.numCore.domain[0] },
    { value: filters.numCore.domain[1], label: filters.numCore.domain[1] }
  ]

  // Multi Dropdown styles
  const customStyles = {
    valueContainer: base => ({
      ...base,
      minHeight: 32,
      overflow: "auto",
      maxHeight: 100,
      margin: 2
    }),
  };

  return (
    <div className={`patternListFilterBox`}>
      <Form.Check
        type="switch"
        id={`List-${listId}-switch`}
        data-testid="patternListFilterSwitch"
        checked={showFilters}
        className="optionLabel patternListFilterToggle"
        onChange={toggleShowFilters}
        label="Filter Patterns"
      />
      {
        showFilters
        ? <div>
            <div style={{margin: "10px 5px"}}>
              <div className='patternListFilterLabel'>Data Size Range:</div>
              <div className='patternListFilterSlider'>
                <Slider 
                  min={filters.size.domain[0]}
                  max={filters.size.domain[1]}
                  step={0.01}
                  value={filters.size.selected}
                  sx={{fontSize: 10}}
                  onChange={(event, newValue) => handleChangeSlider('size', newValue)}
                  valueLabelDisplay="auto"
                  marks={sliderSizeMarks}
                />
              </div>
            </div>

            <div style={{margin: "10px 5px"}}>
              <div className='patternListFilterLabel'>
                {`${targetType == 'numeric' ? "Mean Diff." : "Prob. Diff."} Range:`}
              </div>
              <div className='patternListFilterSlider'>
                <Slider 
                  min={filters.stat[target].domain[0]}
                  max={filters.stat[target].domain[1]}
                  step={(filters.stat[target].domain[1] - filters.stat[target].domain[0])/1000}
                  value={[filters.stat[target].selected[0], filters.stat[target].selected[1]]}
                  onChange={(event, newValue) => handleChangeSliderStat(newValue)}
                  valueLabelDisplay="auto"
                  valueLabelFormat={sliderStatValueFormat}
                  marks={sliderStatMarks}
                />
              </div>
            </div>

            <div style={{margin: "10px 5px"}}>
              <div className='patternListFilterLabel'>Number of Core Attributes:</div>
              <div className='patternListFilterSlider'>
                <Slider
                  min={filters.numCore.domain[0]}
                  max={filters.numCore.domain[1]}
                  step={1}
                  value={filters.numCore.selected}
                  onChange={(event, newValue) => handleChangeSlider('numCore', newValue)}
                  valueLabelDisplay="auto"
                  marks={sliderNumCoreMarks}
                />
              </div>
            </div>
        
            <div style={{margin: "10px 5px"}}>
              <div className='patternListFilterLabel' style={{verticalAlign: 'middle'}}>Has Core Attribute:</div>
              <div className='patternListFilterDropdown' style={{verticalAlign: 'middle'}}>
                <MultiAttributeSelect 
                  customStyles={customStyles}
                  attributes={attributes.map(col=>({
                      label: col,
                      value: col,
                      isDisabled: false
                    }))}
                  onChange={changeFeatures}
                  selected={filters.features.map( d => ({
                    label: d,
                    value: d,
                    isDisabled: false
                  }))}
                />
              </div>
            </div>
            
            <div style={{margin: "10px 5px", textAlign: 'center', width: 300}}>
              <div className='patternListFilterLabel' style={{verticalAlign: 'middle', width: 45}}>Sort By:</div>
              <div className='patternListFilterDropdown' style={{verticalAlign: 'middle', width: 'fit-content'}}>
                <SortButton
                  label={targetType =='numeric' ? "Mean Diff." : "Prob. Diff."}
                  dim={targetType =='numeric' ? 'mu' : 'prob'}
                  sort={filters.sort}
                  onChangeSort={onChangeSort}
                />
                <SortButton
                  label={'Data Size'}
                  dim={'size'}
                  sort={filters.sort}
                  onChangeSort={onChangeSort}
                />
              </div>
            </div>
        </div>
      : null
    }
    </div>
  );
}

export default PatternListFilter;