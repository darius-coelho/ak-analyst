import React from 'react';
import LogControl from "../../components/transformer/control/LogControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for LogControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();    
    
    const props = {
      tType: "Log",
      onTransform
    };

    render(<LogControl {...props} />);

    expect(screen.queryByText("Base:")).toBeTruthy();   

    // Get inputs for the base textbox and set new base
    const input1 = screen.getByTestId("log-base")
    input1.setSelectionRange(0, 2)
    userEvent.type(input1, "{backspace}5");

    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);

    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))
    
    const expectedTransfrom ={
      tType: props.tType, 
      base: 5,
    }

    // Check that the apply transfrom has been called once with the expected transform
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
    expect(onTransform).toHaveBeenCalledTimes(1);

  });

});
