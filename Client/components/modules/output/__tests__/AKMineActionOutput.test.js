import React from 'react';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

import AKMineActionOutput from '../components/AKMineActionOutput';

describe("AK mine action ouput panel", () => {
  it('should test initial state (no connections)', () => {    
    render(<AKMineActionOutput/>);
    expect(screen.queryByText("Mining Results")).toBeNull();   
    
  });

  it('should test with mining output', () => {
    const output = [{
      itemCount: 100,
      featureCount: 10,
      patternCount: 40,
      maxItems: 35,
      minItems: 5,
      maxAttr: 3,
      minAttr: 1
    }]
    render(<AKMineActionOutput output={output}/>);
    expect(screen.queryByText("Mining Results")).toBeTruthy();
    expect(screen.queryByText(`Item Count`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].itemCount}`)).toBeTruthy();
    expect(screen.queryByText(`Feature Count`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].featureCount-1}`)).toBeTruthy();
    expect(screen.queryByText(`Pattern Count`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].patternCount}`)).toBeTruthy();
    expect(screen.queryByText(`Largest Pattern`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].maxItems}`)).toBeTruthy();
    expect(screen.queryByText(`Smallest Pattern`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].minItems}`)).toBeTruthy();
    expect(screen.queryByText(`Maximum Feature Count`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].maxAttr}`)).toBeTruthy();
    expect(screen.queryByText(`Minimum Feature Count`)).toBeTruthy();
    expect(screen.queryByText(`${output[0].minAttr}`)).toBeTruthy();
  });
});
