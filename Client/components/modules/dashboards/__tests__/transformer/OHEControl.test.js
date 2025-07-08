import React from 'react';
import OHEControl from "../../components/transformer/control/OHEControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for NormControl panel", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onTransform = jest.fn();    
    
    const props = {
      tType: "OHE",
      attributes: ['a', 'b', 'c'],
      attr: 'a',
      onTransform,
    };


    render(<OHEControl {...props} />);
    expect(screen.queryByText(/Applying this transform/)).toBeTruthy();

      // Get react-select components
      const selectAttrInput = document.querySelector('.selectAttr input')
      const selectAttrControl = document.querySelector('.selectAttr__control')
    
      // Check react-select components
      expect(selectAttrInput).toBeTruthy();
      expect(selectAttrControl).toBeTruthy();

      // Change attribute to b
      selectAttrInput.focus()
      userEvent.click(selectAttrControl)
      userEvent.click(screen.queryByText("b"))

     // Check that the apply transfrom has not been called
     expect(onTransform).toHaveBeenCalledTimes(0);

     // Click the apply button
     userEvent.click(screen.queryByText("Apply"))
     
     const expectedTransfrom ={
       tType: props.tType, 
       bind: "b"
     }
 
     // Check that the apply transfrom has been called once with the expected transform
     expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
     expect(onTransform).toHaveBeenCalledTimes(1);
  });
});
