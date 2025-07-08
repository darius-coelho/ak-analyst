import React from 'react';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

import AKBrowseActionOutput from '../components/AKBrowseActionOutput';

describe("AK browse action ouput panel", () => {
  it('should test initial state (no connections)', () => {    
    render(<AKBrowseActionOutput output={null}/>);
    expect(screen.queryByText(
      "Browse patterns by clicking the pattern browser button in the panel to the left."
    )).toBeTruthy();  
  });

  it('should test initial state with null output', () => {  
    render(<AKBrowseActionOutput output={[null]}/>);
    expect(screen.queryByText(
      "Browse patterns by clicking the pattern browser button in the panel to the left."
    )).toBeTruthy();       
  });

  it('should test initial state with selected patterns in output', () => {  
    const output = [{
      errMsg: "",
      selectedPatterns: [
        {
          ID: 2,
          selectedFeature: "a",
          attributes: [
            { attribute: "a" },
            { attribute: "b" }
          ]
        },
        {
          ID: 3,
          selectedFeature: "a",
          attributes: [
            { attribute: "a" },
            { attribute: "c" }
          ]
        }
      ]
    }]
    render(<AKBrowseActionOutput output={output}/>);
    expect(screen.queryByText("Number of Patterns Selected:")).toBeTruthy();       
    
    expect(screen.queryByText("2")).toBeTruthy();       
  });

  it('should test with browse output error', () => {
    const output = [{
      errMsg: "Error Browsing",
    }]
    render(<AKBrowseActionOutput output={output}/>);
    expect(screen.queryByText("Error Browsing")).toBeTruthy();
  });
});
