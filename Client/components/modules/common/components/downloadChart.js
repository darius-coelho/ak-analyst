import toImg from 'react-svg-to-image';

export function downloadChart(scale, fname, tagClass) {    
    const clone = document.querySelector(tagClass).cloneNode(true);
    clone.setAttribute("class", "toDownload")
    document.body.appendChild(clone)
    toImg(".toDownload", fname, {
      scale: scale,
      format: 'png',
      quality: 1,
      download: false,
      ignore: null
    }).then(fileData => {
      // Download file
      let downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", fileData);
      downloadAnchorNode.setAttribute("download", fname);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      clone.remove();
    });
  }