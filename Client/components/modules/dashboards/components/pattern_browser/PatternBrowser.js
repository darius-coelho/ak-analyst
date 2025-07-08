import React from 'react';
import { ContextMenu, MenuItem } from "react-contextmenu";
import Select from 'react-select';

import NaviBar from '../../../common/components/NaviBar';
import Summary from "./SummaryStats"
import FeatureBar from "./FeatureBar"
import PatternBubble from "./PatternBubble"
import ProbHistogram from "./ProbHistogram"
import GroupSummary from "./GroupSummary"
import GroupDetail from "./GroupDetail"
import PatternTable from './PatternTable';

import HelpIcon from "../../../common/components/HelpIcon"

import AddressContext from "../../../../AddressContext";

import { downloadChart } from '../../../common/components/downloadChart';

import mixpanel from 'mixpanel-browser';

import "../../../../css/Core.css"
import "../../../../css/Spinners.css"

export default class PatternBrowserBubble extends React.Component {
  state = { 
    targetOptions: [],       
    patternsLoaded: false,
    dataWait: false,
    data: [],
    patternData: [],    
    target: "",
    targetType: "",    
    patterns: null,    
    features: [],
    catLabels: [],
    defaultSummary: null,
    selectedSummary: null,
    selectedAttr: null,
    selectedPatternIdx: null,
    selectedPatternStats: null,    
    selectedGroupSummary: [],
    selectedRootSummary: [],
    selectedInfluenceIdx: null,
    outputPatterns: [],
    showTable: false,
    targetSelectBox: { width: 250, height: 150, top: 10, left: 10 },
    groupOverviewBox: { width: 250, height: 150, top: 10, left: 10 },
    groupSummaryBox: { width: 250, height: 150, top: 10, left: 10 },
    groupDetailBox: { width: 250, height: 150, top: 10, left: 10 },
    featureImportanceBox: { width: 250, height: 150, top: 10, left: 10 },
    histoBox: { width: 250, height: 150, top: 10, left: 10 },
    summaryStatsBox: { width: 250, height: 150, top: 10, left: 10 },    
  }

  // get react context that stores the web address for the ak engine api
  static contextType = AddressContext;
  
  componentDidMount() {
    mixpanel.track("Page View", {'name': 'pattern_browser_bubble'});
    
    this.onResize()
    window.addEventListener('resize', this.onResize.bind(this), false);
    // Set the state of the pattern browser based on the data recieved as props.
    this.setState({
      targetOptions: this.props.targetOptions,
      target: this.props.target,
      targetType: this.props.targetType,
      patterns: this.props.patterns,    
      features: this.props.features,
      defaultSummary: this.props.defaultSummary,
      selectedSummary: this.props.selectedSummary,
      catLabels: this.props.catLabels,
      patternsLoaded: this.props.patternsLoaded
    });              
  }  
    
  onResize (){
    let winWidth = window.innerWidth;
    let winHeight = window.innerHeight;
    let pad = 10
    let targetHt = (this.props.targetOptions.length > 1 ? 50 : 0);
    let panelW = 0.22 * window.innerWidth
    let summaryH = 210
    let menuHt = 35

    this.setState({       
      targetSelectBox: { 
        width: panelW, 
        height: targetHt - pad, 
        top: pad + menuHt, 
        left: pad 
      },            
      featureImportanceBox: { 
        width: panelW, 
        height: 0.5*(winHeight - summaryH - 4*pad - menuHt - targetHt), 
        top: pad + menuHt + targetHt, 
        left: pad 
      },    
      histoBox:{ 
        width: panelW, 
        height: 0.5*(winHeight - summaryH - 4*pad - menuHt - targetHt), 
        top: 2*pad + 0.5*(winHeight - summaryH - 4*pad - menuHt - targetHt) + menuHt + targetHt, 
        left: pad 
      },                   
      summaryStatsBox:{ 
        width: panelW, 
        height: summaryH, 
        top: winHeight - summaryH - pad, 
        left: pad 
      },
      groupOverviewBox:{ 
        width: 0.6*(winWidth - panelW - 3*pad), 
        height: 0.6*(winHeight - 3*pad - menuHt), 
        top: pad + menuHt, 
        left: 2*pad + panelW 
      },
      groupSummaryBox:{ 
        width: 0.4*(winWidth - panelW - 3*pad) - pad, 
        height: 0.6*(winHeight - 3*pad - menuHt), 
        top: pad + menuHt, 
        left: 3*pad + panelW  + 0.6*(winWidth - panelW - 3*pad) 
      },
      groupDetailBox:{ 
        width: winWidth - panelW - 3*pad, 
        height: 0.4*(winHeight - 3*pad - menuHt), 
        top: 2*pad + 0.6*(winHeight - 3*pad - menuHt) + menuHt, 
        left: 2*pad + panelW 
      },
    });
  }

  onChangeSelectedFeature(attr){
    if(this.state.selectedAttr == attr){
      this.setState({selectedAttr: null})  
    }
    else{
      if(this.state.selectedPatternIdx != null){
        var selectedPatternStats = this.state.patterns[attr].stats[this.state.selectedPatternIdx]
        var summary = {
          size: selectedPatternStats.size,
          mu: selectedPatternStats.mu,
          sig: selectedPatternStats.sig, 
          min: selectedPatternStats.min,
          med: selectedPatternStats.med,
          max: selectedPatternStats.max,
        }
        if(this.state.targetType == "binary"){
          summary = {
            size: selectedPatternStats.size,
            prob: selectedPatternStats.prob,
          }
        }
        this.setState({selectedAttr: attr, selectedPatternStats: selectedPatternStats, selectedSummary: summary, selectedInfluenceIdx: null})      
      }
      else {
        this.setState({selectedAttr: attr});
      }      
    }    
  }

  onChangeSelectedPattern(idx){
    if(this.state.selectedPatternIdx == idx){ 
      var summary = this.state.defaultSummary     
      this.setState({
        selectedPatternIdx: null,
        selectedPatternStats: null,
        selectedSummary: summary,
        selectedGroupSummary: [],
        selectedInfluenceIdx: null
      });
    }
    else{
      var selectedPatternStats = this.state.patterns[this.state.selectedAttr].stats[idx]
      var summary = {
        size: selectedPatternStats.size,
        mu: selectedPatternStats.mu,
        sig: selectedPatternStats.sig, 
        min: selectedPatternStats.min,
        med: selectedPatternStats.med,
        max: selectedPatternStats.max,
      }
      
      if(this.state.targetType == "binary"){
        summary = {
          size: selectedPatternStats.size,
          prob: selectedPatternStats.prob,
        }
      }

      this.setState({
        selectedPatternIdx: idx,
        selectedPatternStats: selectedPatternStats,
        selectedSummary: summary,
        selectedInfluenceIdx: null
      });

      let xhttp = new XMLHttpRequest();    
      var setState = this.setState.bind(this);

      const endPoint = this.context.address + "GetPatternSummary"
      xhttp.open("POST", endPoint, true);
      xhttp.withCredentials = true;
      xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhttp.setRequestHeader('Access-Control-Allow-Origin', '*');

      xhttp.onload = function() {
        if (xhttp.readyState === xhttp.DONE) {
          if (xhttp.status === 200) {
            var response = JSON.parse(xhttp.responseText)  
            setState({
              selectedGroupSummary: response.list,
              selectedRootSummary: response.root,
              selectedInfluenceIdx: null
            })            
          } 
        }
      }
      
      var packet = {
        target: this.state.target,
        selectedAttr: this.state.selectedAttr,
        ids: [selectedPatternStats.ID]
      };

      xhttp.send(JSON.stringify(packet));      
    }    
  }  

  onSelectInfluence(index, selectedFilters){ 
    this.setState({dataWait: true})  
    let xhttp = new XMLHttpRequest();    
    const setState = this.setState.bind(this);
    
    const endPoint = this.context.address + "GetPlotData"
    xhttp.open("POST", endPoint, true);
    xhttp.withCredentials = true;
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
    
    xhttp.onload = function() {
      if (xhttp.readyState === xhttp.DONE) {
        if (xhttp.status === 200) {
          var response = JSON.parse(xhttp.responseText)  
          setState({
            data: response,
            selectedInfluenceIdx: index,
            dataWait: false
          })            
        }
      }
    }
    
    var packet = {
      idx: index,
      target: this.state.target,
      targetType: this.state.targetType,
      shap: this.state.selectedPatternStats.shap,          
      selectedFilters: selectedFilters
    }    
    xhttp.send(JSON.stringify(packet));
  }
  
  onViewTable(idx){
    let xhttp = new XMLHttpRequest();          
    const setState = this.setState.bind(this);
    const endPoint = this.context.address + "GetPatternData"
    xhttp.open("POST", endPoint, true);
    xhttp.withCredentials = true;
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
  
    xhttp.onload = function() {
      if (xhttp.readyState === xhttp.DONE) {
        if (xhttp.status === 200) {
          const result = JSON.parse(xhttp.responseText)          
          setState({patternData: result, showTable: true})
        }
      }
    }
  
    var packet = {
      idx: idx,
      target: this.state.target,
      type: 'json'
    }
    
    xhttp.send(JSON.stringify(packet));  
  }

  onHideTable(){
    this.setState({showTable: false})
  }
  
  onDownload(idx){    
    let xhttp = new XMLHttpRequest();          
    const endPoint = this.context.address + "GetPatternData"
    xhttp.open("POST", endPoint, true);
    xhttp.withCredentials = true;
    xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
  
    xhttp.onload = function() {
      if (xhttp.readyState === xhttp.DONE) {
        if (xhttp.status === 200) {                  
          var dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(xhttp.responseText);
          var downloadAnchorNode = document.createElement('a');
          downloadAnchorNode.setAttribute("href", dataStr);
          downloadAnchorNode.setAttribute("download", "data-pattern-" + idx + ".csv");
          document.body.appendChild(downloadAnchorNode); // required for firefox
          downloadAnchorNode.click();
          downloadAnchorNode.remove();          
        }
      }
    }
  
    var packet = {
      idx: idx,
      target: this.state.target,
      type: 'csv/Text'
    }
    
    xhttp.send(JSON.stringify(packet));    
  }

  onDownloadChart(e, data) {
    const fname = `Pattern ${this.state.selectedPatternIdx} - ${data.name}.png`
    downloadChart(3, fname, data.tagClass)
  }

  /**
   * Adds a pattern to the list of output patterns
   * @param {json} pattern - object containing the pattern information
   */
  onAddOutputPattern(pattern) {
    this.setState({
      outputPatterns: [...this.state.outputPatterns, pattern]
    })
  }

  /**
   * Remove a pattern from the output patterns
   * @param {number} id - the pattern id
   * @param {string} feature - the feature selected at the time the pattern was added to the output
   */
  onRemoveOutputPattern(id, feature) {
    this.setState({
      outputPatterns: this.state.outputPatterns.filter(d => d.ID != id && d.selectedFeature != feature)
    })
  }

  /**
   * Sets the the filter type to include or exclude.
   * @param {object} selectedOption - Event handler for tier input component.
   */
   onTargetChange = (selectedOption) => {
    const tmpIdx = this.state.selectedPatternIdx
    
    this.state.target = selectedOption.value
    this.state.patterns = this.props.analystResults[selectedOption.value].patterns
    this.state.features = this.props.analystResults[selectedOption.value].features
    this.state.defaultSummary = this.props.analystResults[selectedOption.value].summary
    this.state.selectedSummary = this.props.analystResults[selectedOption.value].summary
    this.state.catLabels = this.props.analystResults[selectedOption.value].catLabels
    this.state.selectedPatternIdx = null
    this.state.selectedPatternStats = null
    this.state.selectedGroupSummary = []
    this.state. selectedInfluenceIdx = null
    
    this.onChangeSelectedPattern(tmpIdx)
  }

  /* On exit update the output */
  onExit() {
    this.props.setOutput([{
      errMsg: "",
      selectedPatterns: this.state.outputPatterns,
      target: this.state.target      
    }])
  }
   
  /***************************UI Rendering Function******************************/
  render() {
    
    return(
      <div style={{boxSizing: 'unset', lineHeight: "normal"}}>        
        <ContextMenu id="svg_context_menu">
          <MenuItem onClick={this.onDownloadChart.bind(this)}>
            Save
          </MenuItem>
          <MenuItem>
            Cancel
          </MenuItem>
        </ContextMenu>
        <div className="contentdiv" style={this.state.summaryStatsBox}>              
          <label className="contentDivHead" title={"Summary Statistics"}>Summary Statistics</label>
          <HelpIcon 
            content={
              `This panel displays the statistics for the selected pattern (e.g. the count / size of the pattern, 
              mean and standard deviation of the target variable within the pattern, etc) along with how it 
              compares to the summary statistics for the full dataset (i.e. whether it is higher / lower than the full dataset). 
              If no pattern is selected only the summary statistics of the full dataset are displayed.`
            }
          />
          <Summary 
            {...this.state.summaryStatsBox} 
            data={this.state.selectedSummary} 
            defaultData={this.state.defaultSummary}             
            targetType={this.state.targetType}>              
          </Summary>
        </div>

        <div className="contentdiv" style={{...this.state.featureImportanceBox, overflowY: "auto"}}>
          <label className="contentDivHead" title={"Feature Importance"}>Feature Importance</label>
          <HelpIcon 
            content={
              `This panel shows a bar for each attribute indicating the relative predictive power of each attribute. 
              The gray bars show the global importance while selecting a group will add blue bars which indicate 
              the local feature importance (i.e. the features important to a specific pattern / group).`              
            }
          />
          <FeatureBar 
            data={this.state.features} 
            X={"score"} 
            Y={"attribute"} 
            selectedAttr={this.state.selectedAttr} 
            selectedPatternIdx={this.state.selectedPatternIdx} 
            patterns={this.state.patterns}
            summary={this.state.defaultSummary}
            onChangeSelected={this.onChangeSelectedFeature.bind(this)} 
            width={this.state.featureImportanceBox.width} 
            height={this.state.featureImportanceBox.height-40} 
            padding={15} />                        
        </div>

        <div className="contentdiv" style={this.state.histoBox}>              
          <label className="contentDivHead" title={"Probability Histogram"}>Probability Histogram</label>
          <HelpIcon 
            content={
              `This panel shows the distribution of the target variable for the full dataset (gray) 
              and the data that falls within the selected pattern (blue).`
            }
          />
          {
            this.state.defaultSummary != null
            ? <ProbHistogram 
                data={this.state.defaultSummary.hist} 
                selectedPatternStats={this.state.selectedPatternStats} 
                X={"bin_edges"} 
                Y={"freq"} 
                target={this.state.target}
                targetType={this.state.targetType}
                width={this.state.histoBox.width-20} 
                height={this.state.histoBox.height-50} 
                padding={45} />
            :  <div className="placeholderText">
                  Select a target variable and click mine patterns
               </div>
          }
        </div>

        <div className="contentdiv" style={this.state.groupOverviewBox}>
          <label className="contentDivHead" title={"Groups"}>Groups</label>         
          {
            this.state.patterns != null && this.state.selectedAttr != null
            ? <PatternBubble 
                  data={this.state.patterns}
                  catLabels={this.state.catLabels}   
                  X={this.state.selectedAttr} 
                  Y={this.state.target} 
                  selectedPattern={this.state.selectedPatternIdx}
                  onChangeSelected={this.onChangeSelectedPattern.bind(this)} 
                  width={this.state.groupOverviewBox.width} 
                  height={this.state.groupOverviewBox.height - 75} 
                  padding={50} />
            :  <div className="placeholderText">
                  Select a feature from the <span style={{fontWeight:"bold"}}>Feature Importance</span> tile on the left.
               </div>
          }
        </div>

        <div className="contentdiv" style={{...this.state.groupSummaryBox}}>
          <label className="contentDivHead" title={"Group Summary"}>Group Summary</label>
          <HelpIcon 
            content={
              `This panel shows all feature's distributions for the selected group. 
              It distinguishes between the "Core Attributes" (i.e. attributes that define the pattern) and the "Other Attributes."
              Each feature is divided into 3 bins – low, medium and high. 
              Each bin is then colored from white to blue based on the number of points within the bin. 
              The green / red bars to the right are based on Shapley values and show the relative contribution 
              of the attribute on the change in the target variable.`
            }
          />
          <GroupSummary 
            data={this.state.selectedGroupSummary}
            root={this.state.selectedRootSummary}
            X={"score"} 
            Y={"attribute"} 
            selectedAttr={this.state.selectedAttr} 
            target={this.state.target}
            onChangeSelected={this.onChangeSelectedFeature.bind(this)} 
            width={this.state.groupSummaryBox.width-10} 
            height={this.state.groupSummaryBox.height-50} 
            padding={15} />
        </div>

        <div className="contentdiv" style={{...this.state.groupDetailBox, overflowY: "auto"}}>
          <label className="contentDivHead" title={"Group Detail"}>Group Detail</label>
          <HelpIcon 
            content={
              `This panel displays more detailed information about the selected pattern or group. 
              Clicking on a circle in the group bubble chart updates the group detail with the information about the selected pattern.
              This includes each of the pattern constraints (e.g. attribute range). 
              The green bars are based on Shapley values and indicate the relative contribution 
              of each of the constraints to the change in the target variable.`
            }
          />
          {
            this.state.selectedPatternIdx != null && this.state.selectedAttr != null
            ? <GroupDetail 
                data={this.state.selectedPatternStats}
                root={this.state.selectedRootSummary}
                description = {this.state.patterns[this.state.selectedAttr].descr[this.state.selectedPatternIdx]}   
                selectedFeature= {this.state.selectedAttr}
                selectedPatternIdx = {this.state.selectedPatternIdx}
                catLabels={this.state.catLabels}             
                target={this.state.target}
                targetType={this.state.targetType}
                rawData={this.state.data}                                            
                selectedIdx={this.state.selectedInfluenceIdx}
                onSelect={this.onSelectInfluence.bind(this)}
                dataWait={this.state.dataWait}
                onViewTable={this.onViewTable.bind(this)}
                onDownload={this.onDownload.bind(this)}
                outputPatterns={this.state.outputPatterns}
                onAddOutputPattern={this.onAddOutputPattern.bind(this)}
                onRemoveOutputPattern={this.onRemoveOutputPattern.bind(this)}
                width={this.state.groupDetailBox.width-2} 
                height={this.state.groupDetailBox.height-50} 
                padding={15} />
            : <div className="placeholderText">
                Select a group from the <span style={{fontWeight:"bold"}}>Group Plot</span> tile above.
              </div>
          }
        </div>

      {
	this.state.targetOptions.length > 1
	?
        <div className="contentdiv" style={{...this.state.targetSelectBox, boxShadow: "none"}}>
          <div style={{display: 'inline-block'}}>Target: </div>
          <div style={{display: 'inline-block', marginLeft: 10, width: this.state.targetSelectBox.width-70}}>
          <Select              
              value={{value: this.state.target, label: this.state.target}}
              isMulti={false}
              onChange={this.onTargetChange.bind(this)}
              options={this.state.targetOptions.map(d => ({value: d, label: d}))} 
              className="selectTarget"
              classNamePrefix="selectTarget"
            />
          </div>
        </div>
	  : null
      }
        <NaviBar
          backToData = {
            'prevProps' in this.props 
            ? {pathname: "/feature-explorer", state: this.props.prevProps}
            : {pathname: "/main"}
          }
          onBack={this.onExit.bind(this)}
        />

        {
          this.state.showTable
          ? <PatternTable 
              data={this.state.patternData} 
              onHide={this.onHideTable.bind(this)} 
              onDownload={() => this.onDownload(this.state.selectedPatternIdx)}
            />
          : null
        }

        {
          ! this.state.patternsLoaded
          ? <div className="loaderContainer" style={{border: "none"}}>
              <div className="loaderBarA" style={{top: "40%"}} />
            </div>
          : null
        }

      </div>      
    );
  }
}

