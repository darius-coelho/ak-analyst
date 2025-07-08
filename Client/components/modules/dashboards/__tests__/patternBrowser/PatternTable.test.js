import React from 'react';
import PatternTable from '../../components/pattern_browser/PatternTable';

import {render, cleanup, screen, fireEvent, waitForElement } from "@testing-library/react";
import userEvent from '@testing-library/user-event';

describe("Test for Pattern Table modal", () => {
  afterEach(cleanup);

  it("should test the initial state", () => {
    const onHide = jest.fn();
    const onDownload = jest.fn();

    const props = {
      tType: "Repl",
      width: 100,
      data:[
        {'a': 1, 'b': 2, 'c': 'x'},
        {'a': 2, 'b': 3, 'c': 'y'},
        {'a': 3, 'b': 4, 'c': 'z'},
      ],
      onHide,
      onDownload
    };

    render(<PatternTable {...props} />);
  
    // Test table rendered
    expect(screen.queryByText("x")).toBeTruthy();
    expect(screen.queryByText("y")).toBeTruthy();
    expect(screen.queryByText("z")).toBeTruthy();

    // Test Download button
    expect(screen.queryByText("Download")).toBeTruthy();
    userEvent.click(screen.queryByText("Download"))
    expect(onDownload).toHaveBeenCalledTimes(1);    

    // Test Done button
    expect(screen.queryByText("Done")).toBeTruthy();
    userEvent.click(screen.queryByText("Done"))
    expect(onHide).toHaveBeenCalledTimes(1);    

  });
});
