import React from 'react';

import "../../../css/Core.css"

import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from "@ag-grid-community/client-side-row-model"

import '@ag-grid-community/core/dist/styles/ag-grid.css';
import '@ag-grid-community/core/dist/styles/ag-theme-blue.css';

export default function DataTable(props) {
  
  if(!props.show){
    return null
  }

  if(props.data.length < 1){
    return <div className="placeholderText">Load a data file to begin.</div>
  }

  const columnDefs = Object.keys(props.data[0]).map( d => ({headerName: d, field: d, sortable: true}))

  const divStyle = {
    marginTop:  props.top,
    marginLeft: props.left,
    width: props.width,
    height: props.height,
    overflow: 'hidden',
    zIndex: 0
  }

  return (
      <div className="ag-theme-blue" style={divStyle}>
          <AgGridReact
              modules={[ClientSideRowModelModule]}
              rowData={props.data}
              columnDefs={columnDefs}>
          </AgGridReact>
      </div>
  );
}
