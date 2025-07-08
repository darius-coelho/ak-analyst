import React from 'react';

import DataTable from "../../../charts/components/DataTable"
import "../../../../css/Modal.css"

/**
 * Component that displays the pattern data in a table
 * @param {bool} show - Flag to indicate if the table should be displayed
 * @param {array} data - The data within the pattern
 * @param {function} onDownloadData - Function to download the data as a csv
 * @param {function} onHide - Function to close the table
*/
const PatternTable = (props) => {

  const { show, data, onDownloadData, onHide } = props

  if(!show || data == null) {
    return null
  }

  return (
    <div className="ak-modal">
    <div className="ak-modal-content-fit" style={{textAlign: "left"}}>
      <label className="contentDivHead" title={"Pattern Data Items"}>Pattern Data Items</label>
      <DataTable
        show={true}
        rows={25}
        data={data}
        top={25}
        left={25}
        width={"calc(100% - 50px)"}
        height={"calc(100% - 140px)"}
      />      
      <div className="ak-modal-buttonBox-fit">
        <input type="button" className="coreButton" onClick={onDownloadData} value={"Download"} />
        <input type="button" className="coreButton" onClick={onHide} value={"Done"} />
      </div>
    </div> 
  </div>
  );  
}
    
export default PatternTable;