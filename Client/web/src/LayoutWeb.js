import React from "react";

import Layout from "../../components/Layout";

import mixpanel from 'mixpanel-browser';

mixpanel.init('20bdc38e95a94b09a1caf0d6b0f35e9e', {debug: false});

// disable tracking for developers
if (process.env.AK_DEV)  mixpanel.disable()

export default class LayoutWeb extends React.Component {
  /**
   * Opens a link in a new tab
   * @param {string} link - The link to open.
   */
  onGoToLink(link) {
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", link);
    downloadAnchorNode.setAttribute("target", "_blank");
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  render() {
    return <Layout onGoToLink={this.onGoToLink} isWeb={true} onClose={null} />
  }
}
