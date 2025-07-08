import React from 'react';
import { HashRouter } from 'react-router-dom';

import { CleanseActionConfig } from "../components/CleanseActionConfig";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

window.setImmediate = window.setTimeout;

describe("cleanse action config panel", ()=>{
  afterEach(cleanup);

  it('should test initial state', ()=>{
    const config = {
      options: {is_sample: true, nsamples: 1000}
    };
    render(<HashRouter><CleanseActionConfig config={config} /></HashRouter>);
    
    expect(screen.queryByText("Launch Data Transformer")).toBeTruthy();    
  });


  it('should test transform list', ()=>{
    const transforms = [
      {
        attr: "return",
        dependency_list: ['return'],
        enabled: true,
        is_global: false,
        is_visible: true,
        newmax: 1,
        newmin: 0,
        tType: "Norm",
        idx: 0,
        uid: 3
      },
      {
        attr: "dividend",
        dependency_list: ['dividend'],
        enabled: true,
        is_global: false,
        is_visible: true,
        lb: 0,
        ub: 4.955059223738901,
        tType: "Filter",        
        idx: 1,
        uid: 4
      },
      {
        attr: "eps",
        dependency_list: ['eps'],
        enabled: true,
        is_global: false,
        is_visible: true,
        inc: 1,
        lb: "10",
        ub: "-11.31",
        tType: "Clamp",
        idx: 2,
        uid: 5
      },
    ];

    const config = {
      transformations: transforms,
      options: {
        is_sample: true,
        nsamples: 1000,
      }
    };
    
    render(<HashRouter><CleanseActionConfig config={config} /></HashRouter>);
    expect(screen.queryByText("Launch Data Transformer")).toBeTruthy();
    
    
    expect(screen.queryByText("Normalize Values")).toBeTruthy();
    expect(screen.queryByText("return")).toBeTruthy();

    expect(screen.queryByText("Filter Numerical Values")).toBeTruthy();
    expect(screen.queryByText("dividend")).toBeTruthy();

    expect(screen.queryByText("Clamp Values")).toBeTruthy();
    expect(screen.queryByText("eps")).toBeTruthy();
    
  });
});
