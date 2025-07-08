import React, { useState, useContext, useEffect } from 'react';
import { extent, min, max } from "d3";
import { orderBy, difference } from 'lodash';
import axios from "axios"

import NaviBar from '../../../common/components/NaviBar';
import HelpIcon from "../../../common/components/HelpIcon"
import StatusBar from './StatusBar';
import FeatureBar from "./FeatureBar"
import PatternListSet from './PatternListSet';
import PatternInspector from './PatternInspector';
import PatternBubble from './PatternBubble'
import PatternTable from './PatternTable';
import PatternCardEditMenu from './PatternCardEditMenu';
import PatternBuilder from './PatternBuilder'

import AddressContext from "../../../../AddressContext";

import { useInfoToastContext } from '../../../common/components/InfoToastContext';

import mixpanel from 'mixpanel-browser';
import api from '../../../../../apis/api';

import "../../../../css/Core.css"
import "../../../../css/Spinners.css"

/**
 * Re-positions an item within a list.
 * @param {array} list - The list of items in the original order.
 * @param {int} startIndex - The current index of the item to be re-positioned.
 * @param {int} endIndex - The new index of the item to be re-positioned.
 */
const reorder = (list, startIndex, endIndex) => {
  const [removed] = list.splice(startIndex, 1);
  list.splice(endIndex, 0, removed);
  return list;
};

/**
 * Moves an item from one list to another list.
 * @param {array} sourceList - The list containing the item to be moved.
 * @param {array} destinationList - The list to which the item should be moved.
 * @param {int} srcIdx - The current index of the item in the source list.
 * @param {int} dstIdx - The new index of the item in the destination list.
 */
const move = (sourceList, destinationList, srcIdx, dstIdx) => {
  const sourceClone = Array.from(sourceList);
  const destClone = Array.from(destinationList);
  const [removed] = sourceClone.splice(srcIdx, 1);

  destClone.splice(dstIdx, 0, removed);

  const result = {};
  result["src"] = sourceClone;
  result["dst"] = destClone;

  return result;
};


/**
 * Genertates the dimensions for panels in the layout
 * @param {string} layout - The current interface layout
 * @param {boolean} isSelected - Indicates if a pattern is selected
 */
const getLayoutDims = (layout, isSelected) => {
  const winWidth = window.innerWidth;
  const winHeight = window.innerHeight;
  const menuHt = 35
  const pad = 10
  const statusHt = 40
  const bubbleMapHt = 350
  const panelWd = 350

  const fullHeight = winHeight - statusHt - 3*pad - menuHt
  const detailWidth = isSelected
                      ? (layout == 'detail' ?  winWidth - 3*pad - panelWd :  570)
                      : 0

  const dims = {
    statusBox: {
      width: winWidth - 2*pad,
      height: statusHt,
      top: pad + menuHt,
      left: pad
    },
    featureImportanceBox: {
      width: panelWd,
      height: fullHeight - pad - bubbleMapHt,
      top: 2*pad + menuHt + statusHt,
      left: pad
    },
    bubbleMapBox: {
      width: panelWd,
      height: bubbleMapHt,
      top: winHeight - pad - bubbleMapHt,
      left: pad
    },
    patterListSetBox: {
      width: winWidth - panelWd - detailWidth - (detailWidth > 0 ? 4 : 3)*pad , 
      height: fullHeight,
      top: 2*pad + menuHt + statusHt,
      left: panelWd + 2*pad
    },
    patterDetailBox: {
      width: detailWidth,
      height: fullHeight,
      top: 2*pad + menuHt + statusHt,
      left: winWidth - detailWidth - pad
    },
    patterBuilderBox: {
      width: detailWidth,
      height: fullHeight,
      top: 2*pad + menuHt + statusHt,
      left: winWidth - detailWidth - pad
    }
  }

  switch(layout){
    case 'detail':
      return {
        ...dims,
        featureImportanceBox: null,
        bubbleMapBox: null,
        patterListSetBox: {
          width: panelWd,
          height: fullHeight,
          top: 2*pad + menuHt + statusHt,
          left: pad
        }
      }
    case 'bubble':
      return {
        ...dims,
        featureImportanceBox: null,
        bubbleMapBox: {
          width: winWidth - 3*pad - panelWd - detailWidth,
          height: fullHeight,
          top: 2*pad + menuHt + statusHt,
          left: pad
        },
        patterListSetBox: {
          width: panelWd,
          height: fullHeight,
          top: 2*pad + menuHt + statusHt,
          left: winWidth - detailWidth - panelWd - pad
        },
        patterDetailBox: {
          width: detailWidth - pad,
          height: fullHeight,
          top: 2*pad + menuHt + statusHt,
          left: winWidth - detailWidth
        }
      }
    default:
      return(dims)
  }
}

/**
 * Generates a new pattern set if an invalid set is provided
 * @param {json} config - The config of the pattern browser node
 * @param {string} targets - The list of target attribute or feature of the mining procedure
 * @param {string} targetType - The target type - numerical/binary
 * @param {json} overallSummary - Summary stats of the dataset that was mined
 * @param {array} patterns -  List of mined patterns
 */
const setupPatternSet = (config, targets, targetType, overallSummary, patterns) => {
  const patternSet = config.patternSet

  const targetFilters = targets.reduce( (acc, target) => {
    return {
      ...acc,
      [target]: targetType == 'numeric'
                ? {
                    domain: extent(patterns, (d) => (+d.stats[target].mu - overallSummary.stats[target].mu)),
                    selected: extent(patterns, (d) => (+d.stats[target].mu - overallSummary.stats[target].mu))
                  }
                : {
                    domain: extent(patterns, (d) => (+d.stats[target].prob - overallSummary.stats[target].prob)*100),
                    selected: extent(patterns, (d) => (+d.stats[target].prob - overallSummary.stats[target].prob)*100)
                  }
    }
    
    }, {})

  // Initialize filters for pattern lists
  const listFilters = {
    sort: {dim: null, direction: null},
    features: [],
    numCore: {
              domain: [1, max(patterns, d => d.core.length)],
              selected: [1, max(patterns, d => d.core.length)],
             },
    stat: targetFilters,
    size: {
            domain: [0, 100],
            selected: [0, 100],
          },
  }

  /**
   * Sets up the patterns (i.e name and filters) for a pattern list
   * @param {array} listPatterns - a list of pattern descriptions that belong to a list
   * @param {json} listPatternNames - an object mapping pattern IDs to exisiting pattern names
   * @param {json} listPatternTags - an object mapping pattern IDs to exisiting pattern tags
   */
  const setupListPatterns = (listPatterns, listPatternNames, listPatternTags) => {
    return listPatterns.map( (d,i) => {
      const stat = targetType == "numeric"
                  ? +d.stats[targets[0]].mu - overallSummary.stats[targets[0]].mu
                  : (+d.stats[targets[0]].prob - overallSummary.stats[targets[0]].prob)*100
                  
      const defaultName = targetType == "numeric"
                          ? `${stat >= 0 ? "High" : "Low" } ${targets[0]}`
                          : `${stat >= 0 ? "High" : "Low" } ${targets[0]} Prob.`
      return {
        ...d,
        name: listPatternNames && listPatternNames.hasOwnProperty(d.ID) ? listPatternNames[d.ID] : defaultName,
        filters: Object.keys(overallSummary.attributes).reduce( (acc, v) => {
          return{
            ...acc,
            [v]: d.core.includes(v) ? 'In' : 'Off'
          }
        }, {}),
        tags: listPatternTags && listPatternTags.hasOwnProperty(d.ID) ? listPatternTags[d.ID] : []
      }
    })
  }

  if(patternSet.length > 0) {
    // Determine the patterns present
    const patternsPresent = patternSet.reduce((acc, d) => [...acc, ...(d.patterns.map( p => p.ID))], [])
    // Determine the newly added patterns
    const newPatternIDs = patterns.filter(p => !patternsPresent.includes(p.ID)).map(d => d.ID)

    // Set up the pattern set with the new stats of the patterns
    const updatedPatternSet = patternSet.map((d) => {
      const listPatternIDs = d.name == 'Mined Patterns'
                        ? [...(d.patterns.map(d => d.ID)), ...newPatternIDs]
                        : d.patterns.map(d => d.ID)
      const listRawPatterns = patterns.filter(p => listPatternIDs.includes(p.ID))
      const listPatternNames = d.patterns.reduce((acc, d) => ({...acc, [d.ID]: d.name}), {})
      
      const listPatternTags = d.patterns.reduce((acc, d) => ({...acc, [d.ID]: d.tags}), {})
      return {
        ...d,
        patterns: setupListPatterns(listRawPatterns, listPatternNames, listPatternTags),
        filters: listFilters
      }
    })

    return updatedPatternSet
  }

  return [
    {
      name: "Mined Patterns",
      patterns: setupListPatterns(patterns),
      filters: listFilters
    },
    {
      name: "Pinned Patterns",
      patterns: [],
      filters: listFilters
    }
  ]
}

const addCustomPattern = (newPattern, listIdx, patternSet, selectedTarget, targets, targetType, overallSummary) => {
  
  const stat = targetType == "numeric"
            ? +newPattern.stats[targets[0]].mu - overallSummary.stats[targets[0]].mu
            : (+newPattern.stats[targets[0]].prob - overallSummary.stats[targets[0]].prob)*100

  const patternName = targetType == "numeric"
                    ? `(Custom) ${stat >= 0 ? "High" : "Low" } ${targets[0]}`
                    : `(Custom) ${stat >= 0 ? "High" : "Low" } ${targets[0]} Prob.`
  
  const newPatternListItem = {
    ...newPattern,
    filters: Object.keys(overallSummary.attributes).reduce( (acc, v) => {
      return{
        ...acc,
        [v]: newPattern.core.includes(v) ? 'In' : 'Off'
      }
    }, {}),
    name: patternName,
    tags: []
  }

  const coreFilterDomain = [1, max([patternSet[0].filters.numCore.domain[1], newPattern.core.length])]
  
  const updateNumCoreFilter = (filter) => {    
    return {
      domain: coreFilterDomain,
      selected: [
        filter.selected[0],
        filter.domain[1] == filter.selected[1] ? coreFilterDomain[1] : filter.selected[1]
      ]
    }
  }

  const targetsFilterDomain = targets.reduce((acc, target) => {
    return {
      ...acc,
      [target]: targetType == 'numeric'
                ? [
                    min([patternSet[0].filters.stat[target].domain[0], (+newPattern.stats[targets[0]].mu - overallSummary.stats[targets[0]].mu)]),
                    max([patternSet[0].filters.stat[target].domain[1], (+newPattern.stats[targets[0]].mu - overallSummary.stats[targets[0]].mu)])
                  ]
                : [
                    min([patternSet[0].filters.stat[target].domain[0], (+newPattern.stats[target].prob - overallSummary.stats[target].prob)*100]),
                    max([patternSet[0].filters.stat[target].domain[1], (+newPattern.stats[target].prob - overallSummary.stats[target].prob)*100])
                  ]
    }
  }, {})


  const updateStatFilter = (filter) => {
    return targets.reduce((acc, target) => {
      return {
        ...acc,
        [target]: {
          domain: targetsFilterDomain[target],
          selected: [
            filter[target].domain[0] == filter[target].selected[0] ? targetsFilterDomain[target][0] : filter[target].selected[0],
            filter[target].domain[1] == filter[target].selected[1] ? targetsFilterDomain[target][1] : filter[target].selected[1]
          ]
        }
      } 
    }, {})
  }

  const newPatternSet = patternSet.reduce((acc, d, i) => {
    return [
      ...acc,
      {
        ...d,              
        patterns: i == listIdx ? [...d.patterns, newPatternListItem]  : d.patterns,
        filters: {
          ...d.filters,
          numCore: updateNumCoreFilter(d.filters.numCore),
          stat: updateStatFilter(d.filters.stat)
        }
      }
    ]  
  }, [])

  return newPatternSet
}

/**
 * Renders a card based interface for browsing patterns
 * @param {json} config - The config of the pattern browser node
 * @param {string} target - The target attribute or feature of the mining procedure
 * @param {string} targetType - The target type - numerical/binary
 * @param {number} alpha - The pval cutoff for significance
 * @param {json} overallSummary - Summary stats of the dataset that was mined
 * @param {array} patterns - List of mined patterns
 * @param {array} features - List of feature objects
 * @param {json} catLabels - Object that contains all categories in a nomial attribute
 * @param {array} data - The data sample
 */
const PatternBrowserCard = (props) => {

  const { targets, targetType, alpha, overallSummary, features, catLabels } = props

  // get react context that stores the web address for the ak engine api
  const context = useContext(AddressContext);

  // get react context to set an info toast
  const addInfoToast = useInfoToastContext();
  
  // Setup content dimensions
  const [layout, setLayout] = useState('peek')
  const [dims, setDims] = useState(getLayoutDims('peek', false))
  const [showTable, setShowTable] = useState(false)
  const [tableData, setTableData] = useState(null)
  const [selectedTarget, setSelectedTarget] = useState(targets[0])
  const [patternSet, setPatternSet] = useState([])
  const [allTags, setAllTags] = useState({})
  const [showCardEdit, setShowCardEdit] = useState(false)
  const [showPatternBuilder, setShowPatternBuilder] = useState(false)
  const [patternBuilderListIdx, setPatternBuilderListIdx] = useState(-1)
  const [cardEditParams, setCardEditParams] = useState(null)
  const [selectedPattern, setSelectedPattern] = useState(null)
  const [highlightedFeatures, setHighlightedFeatures] = useState([])
  const [likedPatterns, setLikedPatterns] = useState(
    !props.output || props.output[0]===null || !('selectedPatterns' in props.output[0])
      ? []
      : props.output[0].selectedPatterns
  )
  
  // Update component dimensions when window size changes
  useEffect(() => {
    mixpanel.track("Page View", {'name': 'pattern_browser_card'});    
    setAllTags(props.config.allTags)    
    setPatternSet(setupPatternSet(props.config, targets, targetType, overallSummary, props.patterns))
  }, [])

  // Update component dimensions when the layout changes
  useEffect(() => {
    setDims(getLayoutDims(layout, selectedPattern!=null))
  }, [layout, selectedPattern])

  // Update selected pattern when list is filtered
  useEffect(() => {
    if(selectedPattern != null) {
      let listIdx = 0
      let cardIdx = 0

      for(let i=0; i < patternSet.length; i++){
        const patterns = patternSet[i].patterns
        const idx = patterns.findIndex(d => d.ID == selectedPattern.patternID)
        if(idx >= 0 ){
          listIdx = i
          cardIdx = idx
          break
        }
      }

      const pattern = patternSet[listIdx].patterns[cardIdx]
      const minSize = 100*(+pattern.stats[selectedTarget].size)/overallSummary.stats[selectedTarget].size
      const maxSize = 100*(+pattern.stats[selectedTarget].size)/overallSummary.stats[selectedTarget].size
      const stat = targetType == 'numeric' 
                  ? (+pattern.stats[selectedTarget].mu - overallSummary.stats[selectedTarget].mu)
                  : (+pattern.stats[selectedTarget].prob - overallSummary.stats[selectedTarget].prob)*100
      const filters = patternSet[listIdx].filters
      const inRanges =  minSize >= filters.size.selected[0] && maxSize <= filters.size.selected[1]
                        && stat >= filters.stat[selectedTarget].selected[0] && stat <= filters.stat[selectedTarget].selected[1]
                        && pattern.core.length >= filters.numCore.selected[0] && pattern.core.length <= filters.numCore.selected[1]

      const hasCore = difference(filters.features, pattern.core).length == 0

      if(inRanges && hasCore){
        // If selected pattern within filter, update its index
        setSelectedPattern({
          ...selectedPattern,
          listID: listIdx,
          cardID: cardIdx
        })
      }
      else {
        // If selected pattern outside filter, deselect it
        setSelectedPattern(null)
        if(layout == 'detail') {
          setLayout('peek')
        }
      }
    }
  }, [patternSet])

  // Handle updating focussed target
  useEffect(() => {
    // Reset sorting params for lists when target changed
    if(patternSet.length > 0){
      setPatternSet(
        patternSet.map(list => ({
          ...list,
          filters: {
            ...list.filters,
            sort: {dim: null, direction: null}
          }
        }))
      )
    }
  }, [selectedTarget])

  /**
   * Adds a new empty list to the set of pattern lists.
   */
  const addList = () => {
    const targetFilters = targets.reduce( (acc, target) => {
      return {
        ...acc,
        [target]: targetType == 'numeric'
                  ? {
                      domain: extent(props.patterns, (d) => (+d.stats[target].mu - overallSummary.stats[target].mu)),
                      selected: extent(props.patterns, (d) => (+d.stats[target].mu - overallSummary.stats[target].mu))
                    }
                  : {
                      domain: extent(props.patterns, (d) => (+d.stats[target].prob - overallSummary.stats[target].prob)*100),
                      selected: extent(props.patterns, (d) => (+d.stats[target].prob - overallSummary.stats[target].prob)*100)
                    }
      }
      
      }, {})
    setPatternSet([
      ...patternSet,
      {
        name: `Pattern List ${patternSet.length+1}`,
        patterns: [],
        filters: {
          sort: {dim: null, direction: null},
          features: [],
          numCore: {
                    domain: [1, max(props.patterns, d => d.core.length)],
                    selected: [1, max(props.patterns, d => d.core.length)],
                  },
          stat: targetFilters,
          size: {
                  domain: [0, 100],
                  selected: [0, 100],
                },
        }
      }
    ])
  }

  /**
   * Removes a list from the set of pattern lists.
   * Doesn't allow the first list (mined patterns) to be deleted
   * @param {int} idx - Index of the list in the pattern lists
   */
  const removeList = (idx) => {
    if(idx != 0) {
      const items = patternSet[idx].patterns
      const patternSetClone = Array.from(patternSet);
      patternSetClone.splice(idx,1)

      setPatternSet(patternSetClone.map((d,i) => {
        if(d.name =="Mined Patterns") {
          return {
            ...d,
            patterns: [...d.patterns, ...items]
          }
        }
        return d
      }))
    }
  }

  /**
   * Renames a list in the set of pattern lists.
   * @param {int} idx - Index of the list in the pattern lists
   * @param {string} newName - The new name for the list
   */
  const changeListName = (idx, newName) => {
    setPatternSet(patternSet.map((d,i) => {
      if(idx == i) {
        return {
          ...d,
          name: newName
        }
      }
      return d
    }))
  }

  /**
   * Function to handle dragging an item(pattern card) in a list.
   * @param {json} result - Object generated by beautiful-dnd containing
   *                        source/destination list and item indexes
   *                        for the dragged item
   */
  const onDragCard = (result) => {
    const dst = result.destination
    const src = result.source
    if(src.index == dst.index && src.droppableId == dst.droppableId){
      return
    }

    if(src.droppableId == dst.droppableId){
      const newPatterns = reorder(patternSet[+src.droppableId].patterns, src.index, dst.index)
      setPatternSet(patternSet.map( (d,i) => {
        if(i==+src.droppableId){
          return {
            ...d,
            patterns: newPatterns,
            filters: {
              ...d.filters,
              sort: {dim: null, direction: null}
            }
          }
        }
        return d
      }))

    }
    else {
      const result = move(
                        patternSet[+src.droppableId].patterns,
                        patternSet[+dst.droppableId].patterns,
                        src.index,
                        dst.index
                      )
      setPatternSet(patternSet.map( (d,i) => {
        if(i==+src.droppableId){
          return {
            ...d,
            patterns: result.src,
            filters: {
              ...d.filters,
              sort: {dim: null, direction: null}
            }
          }
        }
        if(i==+dst.droppableId){
          return {
            ...d,
            patterns: result.dst,
            filters: {
              ...d.filters,
              sort: {dim: null, direction: null}
            }
          }
        }
        return d
      }))
    }
  }

  /**
   * Renames a pattern in the pattern list.
   * @param {int} listIdx - Index of the list in the pattern lists
   * @param {int} cardIdx - Index of the card in the pattern list
   * @param {string} newName - The new name for the list
   */
  const changePatternName = (listIdx, cardIdx, newName) => {
    setPatternSet(patternSet.map((d,i) => {
      if(listIdx == i) {
        return {
          ...d,
          patterns: d.patterns.map((v,j) => {
            if(j==cardIdx) {
              return {
                ...v,
                name: newName
              }
            }
            return v
          })
        }
      }
      return d
    }))
  }

  /**
   * Assigns/removes a tag from a card.
   * @param {int} listIdx - Index of the list in the pattern lists
   * @param {int} cardIdx - Index of the card in the pattern list
   * @param {string} tagName - The tag name 
   */
  const changePatternTag = (listIdx, cardIdx, tagName) => {
    setPatternSet(patternSet.map((d,i) => {
      if(listIdx == i) {
        return {
          ...d,
          patterns: d.patterns.map((v,j) => {
            if(j==cardIdx) {
              return {
                ...v,
                tags: v.tags.includes(tagName)
                      ? v.tags.filter(d => d != tagName)
                      : [...v.tags, tagName]
              }
            }
            return v
          })
        }
      }
      return d
    }))
  }

  /**
   * Adds a tag to the list of all tags.
   * @param {string} name - The tag name
   * @param {string} color - The color assigned to the tag
   * @param {int} listIdx - Index of the list in the pattern lists
   * @param {int} cardIdx - Index of the card in the pattern list
   */
  const addNewTag = (name, color, listIdx, cardIdx) => {
    if(name in allTags) {
      addInfoToast("Tag Exists", 'danger')
      return
    }
    setAllTags({
      ...allTags,
      [name]: color
    })
    changePatternTag(listIdx, cardIdx, name)
  }

  /**
   * Removes a tag from the list of all tags and all patterns.
   * @param {string} tagName - The tag name
   */
   const removeTag = (tagName) => {
    if(tagName in allTags) {      
      setPatternSet(patternSet.map((d,i) => {
        return {
          ...d,
          patterns: d.patterns.map((v,j) => {
            return {
              ...v,
              tags: v.tags.filter(d => d != tagName)
            }
          })
        }        
      }))

      setAllTags(current => {        
        const copy = {...current}
        delete copy[tagName]
        return copy;
      });
    }    
  }

  /**
   * Removes a tag from the list of all tags and all patterns.
   * @param {string} tagName - The current tag name
   * @param {string} newName - The tag's new name
   * @param {string} newColor - The tag's new color
   */
   const editTag = (tagName, newName, newColor) => {
    if(tagName in allTags) {      
      setPatternSet(patternSet.map((d,i) => {
        return {
          ...d,
          patterns: d.patterns.map((v,j) => {
            return {
              ...v,
              tags: v.tags.map(d => d == tagName ? newName : d)
            }
          })
        }        
      }))

      if(tagName == newName){
        setAllTags(current => ({...current, [newName]: newColor}))
      }
      else{
        setAllTags(current => {
          const copy = {
            ...current,
            [newName]: newColor
          }
          delete copy[tagName]
          return copy;
        });
      }      
    }    
  }

  /**
   * Sets up the parameters requred for the card edit component and shows it.
   * @param {object} boundingRect - An opject containing the location and size of the card on screen.
   * @param {number} listIdx - Index of the list in the pattern lists
   * @param {number} patternID - The ID of the pattern
   */
  const onShowPatternCardEdit = (boundingRect, listIdx, patternID) => {
    const cardIdx = patternSet[listIdx].patterns.findIndex(d => d.ID == patternID)
    setCardEditParams({
      cardRect: boundingRect,
      listIdx: listIdx,
      cardIdx: cardIdx
    })
    setShowCardEdit(true)
  }

  /**
   * Hides the card edit component and resets its parameters.
   */
  const onHidePatternCardEdit = () => {
    setCardEditParams(null)
    setShowCardEdit(false)
  }

  /**
   * Sets the selected pattern
   * @param {int} listIdx - Index of the list in the pattern lists
   * @param {int} patternID - The ID of the pattern
   */
  const onSelectPattern = (listIdx, patternID) => {
    const cardIdx = patternSet[listIdx].patterns.findIndex(d => d.ID == patternID)
    if(selectedPattern != null && listIdx == selectedPattern.listID && cardIdx == selectedPattern.cardID){
      setSelectedPattern(null)
      if(layout == 'detail') {
        setLayout('peek')
      }
    }
    else {
      setSelectedPattern({
        listID: listIdx,
        cardID: cardIdx,
        patternID: patternID
      })
    }
  }

  /**
   * Sets data filter based on attribute ranges for the selected pattern
   * @param {int} listIdx - Index of the list in the pattern lists
   * @param {string} dim - The dimension to filter on
   */
   const onSortList = (listIdx, dim) => {
    let direction = 'asc'
    if(patternSet[listIdx].filters.sort.dim == dim && patternSet[listIdx].filters.sort.direction == direction){
      direction='desc'
    }

    setPatternSet(patternSet.map((d,i) => {
      if(i == listIdx) {
        const sortedPatterns = orderBy(patternSet[listIdx].patterns, (d) => +d.stats[selectedTarget][dim], [direction])
        return {
          ...d,
          patterns: sortedPatterns,
          filters: {
            ...d.filters,
            sort: {dim: dim, direction: direction}
          }
        }
      }
      return d
    }))
  }

  /**
   * Sets data filter based on attribute ranges for the selected pattern
   * @param {int} listIdx - Index of the list in the pattern lists
   * @param {string} type - The filter type - off/in/out
   */
   const onChangeListFilter = (listIdx, filters) => {
    setPatternSet(patternSet.map((d,i) => {
      if(i == listIdx) {
        return {
          ...d,
          filters: filters
        }
      }
      return d
    }))
  }

  /**
   * Sets the pattern inspector view
   * @param {string} view - View type - peek or detail
   */
  const onChangePatternView = (view) => {
    setLayout(view)
  }

  /**
   * Sets data filter based on attribute ranges for the selected pattern
   * @param {string} attribute - Attribute name
   * @param {string} type - The filter type - off/in/out
   */
  const onChangePatternFilter = (attribute, type) => {
    setPatternSet(patternSet.map((d,i) => {
      if(selectedPattern.listID == i) {
        return {
          ...d,
          patterns: d.patterns.map((v,j) => {
            if(selectedPattern.cardID == j) {
              return {
                ...v,
                filters: {
                  ...v.filters,
                  [attribute]: type
                }
              }
            }
            return v
          })
        }
      }
      return d
    }))
  }

  /**
   * Handles clicking on an attribute in the feature plot - toggles highlighted features
   * @param {string} attr - Name of the clicked attribute
   */
  const onClickFeature = (attr) => {
    const idx = highlightedFeatures.indexOf(attr)
    if(idx > -1) {
      setHighlightedFeatures(highlightedFeatures.filter(d => d != attr))
    }
    else {
      setHighlightedFeatures([...highlightedFeatures, attr])
    }
  }

  /**
   * Expands/Collapses the bubble chart
   */
  const toggleExpandBubble = () => {
    if(layout == 'bubble') {
      setLayout('peek')
    }
    else{
      setLayout('bubble')
    }
  }

  /**
   * Shows a table with the selected pattern's data
   */
  const onShowTable = () => {
    const endPoint = context.address + "GetPatternDataByID"
    const reqData = {
      patternID: selectedPattern.patternID,
      type: 'json'
    }
    axios.post(endPoint, reqData, {withCredentials: true})
    .then((response) => {
      if(response.data){
        setTableData(response.data)
        setShowTable(true)
      }
    })
    .catch(error => {
      console.log(error)
    });    
  }

  /**
   * Hides the table with the selected pattern's data
   */
  const onHideTable = () => {
    setShowTable(false)
  }

  /**
   * Downloads the selected pattern's data
   */
  const onDownloadData = () => {
    const endPoint = context.address + "GetPatternDataByID"
    const reqData = {
      patternID: selectedPattern.patternID,
      type: 'csv/Text'
    }
    axios.post(endPoint, reqData, {withCredentials: true})
    .then((response) => {
      if(response.data){
        const fname = patternSet[selectedPattern.listID].patterns[selectedPattern.cardID].name
        const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(response.data);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "AK Pattern - " + fname + ".csv");
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      }
    })
    .catch(error => {
      console.log(error)
    });
  }

  const onShowPatternBuilder = (idx) => {
    setShowPatternBuilder(true)
    setPatternBuilderListIdx(idx)
  }

  const onHidePatternBuilder = () => {
    setPatternBuilderListIdx(-1)
    setShowPatternBuilder(false)
  }

  const buildPattern = (newPattern) => {
    const req = newPattern.reduce((acc, d) => {
      return {
        ...acc,
        [d.attr]: d.isCat ? { in: d.range } : { lb: d.range[0], ub: d.range[1]}
      }
    }, {})
    
    api.addPattern(
      req,
      (resp) => {
        const newPatternSet = addCustomPattern(resp.data, patternBuilderListIdx, patternSet, selectedTarget, targets, targetType, overallSummary)
        setPatternSet(newPatternSet)
        setPatternBuilderListIdx(-1)
        setShowPatternBuilder(false)
      }
    )    
  }

  /**
   * Sets the config of the browse action on exit
   */
  const onExit = () => {
    try{
      // Update config with transforms
      props.setParams({
        ...props.config,
        target: targets,
        targetType: targetType,
        patternSet: patternSet,
        allTags: allTags
      })

      props.setOutput([{
        errMsg: "",
        selectedPatterns: likedPatterns,
        targets: targets
      }]);
      
      api.freeMemory();
    }
    catch(error){
      console.warn(error)
      addInfoToast(error, 'danger')
    }
  }


  /** Toggles add/remove pattern from the output. */
  const toggleAddOutput = (pattern) => {
    if (likedPatterns.some(d=>d.ID===pattern.ID)) {
      // remove from output
      setLikedPatterns(likedPatterns.filter(d=>d.ID !== pattern.ID))
    } else {
      setLikedPatterns([...likedPatterns, pattern]);
    }
  }
  
  const patternSetMin = patternSet.map(d => ({name: d.name, len: d.patterns.length}))

  return(
    <div style={{boxSizing: 'unset', lineHeight: "normal", height: "100%"}}>
      {
        dims.featureImportanceBox && (layout == 'default' || layout == 'peek')
        ? <div className="contentdiv" style={{...dims.featureImportanceBox, overflowY: "auto"}}>
            <label className="contentDivHead" title={"Feature Importance"}>Feature Importance</label>
            <HelpIcon
              content={
                `This panel shows a bar for each attribute indicating the relative predictive power of each attribute.
                The gray bars show the global importance while selecting a group will add blue bars which indicate
                the local feature importance (i.e. the features important to a specific pattern / group).`
              }/>
            <FeatureBar
              target={selectedTarget}
              features={features}
              X={"score"}
              Y={"attribute"}
              width={dims.featureImportanceBox.width}
              height={dims.featureImportanceBox.height-40}
              padding={15}
              highlightedFeatures={highlightedFeatures}
              selectedPattern={selectedPattern}
              patternList={patternSet}
              onClickFeature={onClickFeature}
            />
          </div>
        : null
      }

      <StatusBar
        style={dims.statusBox}
        targets={targets}
        selectedTarget={selectedTarget}
        setSelectedTarget={setSelectedTarget}
        targetType={targetType}
        dataCount={overallSummary.stats[selectedTarget].size}
        featureCount={features[selectedTarget].length}
        patternCount={props.patterns.length}
      />

      <PatternBubble
        style={dims.bubbleMapBox}
        layout={layout}
        toggleExpandBubble={toggleExpandBubble}
        target={selectedTarget}
        targetType={targetType}
        overallSummary={overallSummary}
        features={features}
        catLabels={catLabels}
        patternSet={patternSet}
        highlightedFeatures={highlightedFeatures}
        selectedPattern={selectedPattern}
        onSelectPattern={onSelectPattern}
      />      

      <PatternInspector
        style={dims.patterDetailBox}
        view={layout}
        patternList={patternSet}
        patternSetMin={patternSetMin}
        changeList={onDragCard}
        selectedPattern={selectedPattern}
        overallSummary={overallSummary}
        highlightedFeatures={highlightedFeatures}
        target={selectedTarget}
        targetType={targetType}
        alpha={alpha}
        catLabels={catLabels}
        changePatternName={changePatternName}
        changeFilter={onChangePatternFilter}
        changePatternView={onChangePatternView}
        onSelectPattern={onSelectPattern}
        onShowTable={onShowTable}
        onDownloadData={onDownloadData}
        toggleAddOutput={toggleAddOutput}
        likedPatterns={likedPatterns}
        allTags={allTags}
        addNewTag={addNewTag}
        editTag={editTag}
        removeTag={removeTag}
        changePatternTag={changePatternTag}
      />

      <PatternListSet
        style={dims.patterListSetBox}
        view={layout}
        catLabels={catLabels}
        overallSummary={overallSummary}
        highlightedFeatures={highlightedFeatures}
        target={selectedTarget}
        targetType={targetType}
        patternSet={patternSet}
        patternSetMin={patternSetMin}
        changeList={onDragCard}
        addList={addList}
        removeList={removeList}
        changeListName={changeListName}
        changeFilter={onChangeListFilter}
        sortList={onSortList}
        onDragCard={onDragCard}
        changePatternName={changePatternName}
        selectedPattern={selectedPattern}
        onSelectPattern={onSelectPattern}
        toggleAddOutput={toggleAddOutput}
        likedPatterns={likedPatterns}
        allTags={allTags}
        cardEditParams={cardEditParams}
        showCardEdit={showCardEdit}
        onShowCardEdit={onShowPatternCardEdit}
        onShowPatternBuilder={onShowPatternBuilder}
      />

      <PatternCardEditMenu
        show={showCardEdit}
        onHide={onHidePatternCardEdit}
        params={cardEditParams}
        data={cardEditParams ? patternSet[cardEditParams.listIdx].patterns[cardEditParams.cardIdx] : null}
        changePatternName={changePatternName}
        patternSetMin={patternSetMin}
        changeList={onDragCard}
        likedPatterns={likedPatterns}
        toggleAddOutput={toggleAddOutput}
        allTags={allTags}
        addNewTag={addNewTag}
        editTag={editTag}
        removeTag={removeTag}
        changePatternTag={changePatternTag}       
      />

      <NaviBar
        backToData = {
          'prevProps' in props
          ? {pathname: "/feature-explorer", state: props.prevProps}
          : {pathname: "/main"}
        }
        onBack={onExit}
      />

      <PatternTable
        show={showTable}
        data={tableData}
        onHide={onHideTable}
        onDownloadData={onDownloadData}
      />

      <PatternBuilder
        show={showPatternBuilder}
        attributes={overallSummary.attributes}
        target={selectedTarget}
        targetType={targetType}
        catLabels={catLabels}
        buildPattern={buildPattern}
        onHide={onHidePatternBuilder}        
      />
    </div>
  );
}

export default PatternBrowserCard;
