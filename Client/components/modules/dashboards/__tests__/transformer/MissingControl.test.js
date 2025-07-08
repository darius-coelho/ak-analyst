import React from 'react';
import MissingControl from "../../components/transformer/control/MissingControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for MissingControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();    
    
    const props = {
      tType: "Missing",
      dType: "Numerical",
      onTransform
    };

    render(<MissingControl {...props} />);

    expect(screen.queryByText("Imputation:")).toBeTruthy();   
    expect(screen.queryByText("Drop")).toBeTruthy();   
    expect(screen.queryByText("Mean")).toBeTruthy();   
    expect(screen.queryByText("Interpolate")).toBeTruthy();   
    expect(screen.queryByText("Pad")).toBeTruthy();       

    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);

    // Change the Selected method
    userEvent.click(screen.queryByText("Mean"))

    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))
    
    const expectedTransfrom1 ={
      tType: props.tType, 
      method: "Mean",
      replaceVal: null,
    }

    // Check that the apply transfrom has been called once with the expected transform
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom1)
    expect(onTransform).toHaveBeenCalledTimes(1);

    // Change the Selected method
    userEvent.click(screen.queryByText("Drop"))

    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))
    
    const expectedTransfrom2 ={
      tType: props.tType + "-Drop", 
      method: "Drop",
      "replaceVal": null,
    }

    // Check that the apply transfrom has been called once with the expected transform
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom2)
    expect(onTransform).toHaveBeenCalledTimes(2);

  });

});
