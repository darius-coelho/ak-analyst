import React from 'react';
import { HashRouter } from 'react-router-dom';

import SplitDataActionOutput from '../components/SplitDataActionOutput';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

describe("Split Data Action Output panel", ()=>{
  afterEach(cleanup);

  it('should test initial state', ()=>{
    render(<HashRouter><SplitDataActionOutput /></HashRouter>);
    
    expect(screen.queryByText("Data 1 Preview")).toBeNull();
    expect(screen.queryByText("Data 2 Preview")).toBeNull();
  });


  it('should test table', ()=>{
    const output = [
        { 
          preview: [
            {'c1': 1, 'c2': 2, 'c3': 3},
            {'c1': 2, 'c2': 3, 'c3': 4},
            {'c1': 3, 'c2': 4, 'c3': 5},
          ]
        },
        { 
          preview: [
            {'c1': 4, 'c2': 5, 'c3': 6},
            {'c1': 5, 'c2': 6, 'c3': 7},
          ]
        }
    ]
    

    const pathTo = jest.fn();
      
    render(<HashRouter><SplitDataActionOutput pathTo={pathTo} output={output} /></HashRouter>);
    
    
    expect(screen.queryByText("Data 1 Preview")).toBeTruthy();
    expect(screen.queryByText("Data 2 Preview")).toBeTruthy();
    expect(screen.queryByText("c1")).toBeTruthy();        
    expect(screen.queryByText("c2")).toBeTruthy();        
    expect(screen.queryByText("c3")).toBeTruthy();        
  });
});
