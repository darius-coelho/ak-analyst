import React from 'react';
import RankControl from "../../components/transformer/control/RankControl";

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';


describe("Test for RankControl panel", () => {
  afterEach(cleanup);

  it("should test the RankControl", () => {
    const onTransform = jest.fn();
    const onSetNRankBins = jest.fn();
    const onSetYAttr = jest.fn();

    const props = {
      tType: "Rank",
      width: 100,
      attributes: ['a', 'b', 'c', 'd'],
      attrTypes: {'a': 'Nominal', 'b': 'Numerical', 'c': 'Nominal', 'd': 'Numerical'},
      attr: 'a',
      onTransform,
      onSetNRankBins,
      onSetYAttr
    };

    render(<RankControl {...props} />);

    // Get react-select components
    const selectAttrInput = document.querySelector('.selectAttr input')
    const selectAttrControl = document.querySelector('.selectAttr__control')
  
    // Check react-select components
    expect(selectAttrInput).toBeTruthy();
    expect(selectAttrControl).toBeTruthy();

    // Change attribute to b
    selectAttrInput.focus()
    userEvent.click(selectAttrControl)
    // Check that current attribute not in list
    expect(screen.queryByText("a")).toBeFalsy();
    // Check that numericals are shown and nominals are not shown
    expect(screen.queryByText("b")).toBeTruthy();
    expect(screen.queryByText("c")).toBeFalsy();
    expect(screen.queryByText("d")).toBeTruthy();
    userEvent.click(screen.queryByText("b"))

    // Change Rank
    const input1 = screen.getByTestId("rank-value")    
    userEvent.type(input1, "{backspace}4");
    
    // Check that the apply transfrom has not been called
    expect(onTransform).toHaveBeenCalledTimes(0);    
    
    // Click the apply button
    userEvent.click(screen.queryByText("Apply"))

    const expectedTransfrom ={
      tType: props.tType,       
      rankattr: "b",
      ranktiers: 4,
    }

    // Check that the apply transfrom has been called once with the expected transform    
    expect(onTransform).toHaveBeenCalledWith(expectedTransfrom)
    expect(onTransform).toHaveBeenCalledTimes(1);         
    expect(onSetNRankBins).toHaveBeenCalledTimes(2);         
    expect(onSetYAttr).toHaveBeenCalledTimes(1);      
  });
});
