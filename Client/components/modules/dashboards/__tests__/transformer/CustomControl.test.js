import React from 'react';
import CustomControl from "../../components/transformer/control/CustomControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for NormControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();  
    
    const props = {
      width: 100,
      name: "attr",
      tType: "Custom",      
      onTransform,
    };

    render(<CustomControl {...props} />);

    // Check the textbox exists
    expect(screen.queryByRole("textbox")).toBeTruthy();
    userEvent.type(screen.queryByRole("textbox"), "attr + 1");

    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);
    
    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))
    
    const expectedTransfrom ={
      tType: props.tType, 
      expr: "attr + 1",
    }

    // Check that the apply transfrom has been called once with the expected transform
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
    expect(onTransform).toHaveBeenCalledTimes(1);
  });
});
