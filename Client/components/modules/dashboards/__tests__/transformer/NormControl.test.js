import React from 'react';
import NormControl from "../../components/transformer/control/NormControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for NormControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {    
    const onTransform = jest.fn();    
    
    const props = {
      tType: "Norm",      
      onTransform
    };

    render(<NormControl {...props} />);

    expect(screen.queryByText("Lower Bound:")).toBeTruthy();
    expect(screen.queryByText("Lower Bound:")).toBeTruthy();

    // Get inputs for the min and max textboxes and set new min and max
    const input1 = screen.getByTestId("norm-lb")
    input1.setSelectionRange(0, 1)
    userEvent.type(input1, "{backspace}1");
    const input2 = screen.getByTestId("norm-ub")
    input2.setSelectionRange(0, 1)
    userEvent.type(input2, "{backspace}10");

    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);

    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))
    
    const expectedTransfrom ={
      tType: props.tType, 
      newmin: 1,
      newmax: 10
    }

    // Check that the apply transfrom has been called once with the expected transform
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
    expect(onTransform).toHaveBeenCalledTimes(1);
  });
});
