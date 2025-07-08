import React from 'react';

import DataTable from "../../../charts/components/DataTable"
import "../../../../css/Modal.css"

/**
 * Functional component that displays the pattern data
 * @param {Object} props.data - The data within the pattern
 * @param {function} props.onDownload - Function to download the data as a csv
 * @param {function} props.onHide - Function to close the table
*/
function PatternTable(props) {

  return (
    <div className="ak-modal">
    <div className="ak-modal-content-fit" style={{textAlign: "left"}}>
      <label className="contentDivHead" title={"Pattern Data Items"}>Pattern Data Items</label>
      
        <DataTable
          show={true}
          rows={25}
          data={props.data}    
          top={25}
          left={25}      
          width={"calc(100% - 50px)"}
          height={"calc(100% - 140px)"}
        />
      

      <div className="ak-modal-buttonBox-fit">
        <input type="button" className="coreButton" onClick={props.onDownload} value={"Download"} />
        <input type="button" className="coreButton" onClick={props.onHide} value={"Done"} />
      </div>
    </div>
  </div>
  );  
}
    
export default PatternTable;