import React from 'react';
import ClampControl from "../../components/transformer/control/ClampControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for ClampControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();    
    
    const props = {
      tType: "Clamp",
      description:{
        min: 1,
        max: 12
      },
      onTransform
    };

    render(<ClampControl {...props} />);

    expect(screen.queryByText("Clamp Min:")).toBeTruthy();
    expect(screen.queryByText("Clamp Max:")).toBeTruthy();

    // Get inputs for the min and max textboxes and set new min and max
    const input1 = screen.getByTestId("clamp-min")
    input1.setSelectionRange(0, 4)
    userEvent.type(input1, "{backspace}2");
    const input2 = screen.getByTestId("clamp-max")
    input2.setSelectionRange(0, 5)
    userEvent.type(input2, "{backspace}10");

    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);

    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))
    
    const expectedTransfrom ={
      tType: props.tType, 
      lb: 2,
      ub: 10
    }

    // Check that the apply transfrom has been called once with the expected transform
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
    expect(onTransform).toHaveBeenCalledTimes(1);
  });
});
