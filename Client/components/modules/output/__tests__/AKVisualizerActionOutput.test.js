import React from 'react';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";

import AKVisualizerActionOutput from "../components/AKVisualizerActionOutput"

describe("AK visualize action ouput panel", () => {
  it('should test output', () => {    
    render(<AKVisualizerActionOutput/>);
    expect(screen.queryByText("Launch the visualizer to see a graphical representation of your data. This action does not produce an output.")).toBeTruthy();       
  });  
});
