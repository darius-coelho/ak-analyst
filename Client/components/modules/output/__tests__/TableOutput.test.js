import React from 'react';
import { HashRouter } from 'react-router-dom';

import TableOutput from "../components/TableOutput";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

describe("cleanse action config panel", ()=>{
  afterEach(cleanup);

  it('should test initial state', ()=>{
    render(<HashRouter><TableOutput /></HashRouter>);
    
    expect(screen.queryByText("Data Preview")).toBeNull();   
  });


  it('should test table', ()=>{
    const output = [{
      preview: [
        {'c1': 1, 'c2': 2, 'c3': 3},
        {'c1': 2, 'c2': 3, 'c3': 4},
        {'c1': 3, 'c2': 4, 'c3': 5},
      ]
    }]

    const pathTo = jest.fn();
      
    render(<HashRouter><TableOutput pathTo={pathTo} output={output} /></HashRouter>);
    
    expect(screen.queryByText("Download")).toBeTruthy();     

    expect(screen.queryByText("Data Preview")).toBeTruthy();        
    expect(screen.queryByText("c1")).toBeTruthy();        
    expect(screen.queryByText("c2")).toBeTruthy();        
    expect(screen.queryByText("c3")).toBeTruthy();        
  });
});
