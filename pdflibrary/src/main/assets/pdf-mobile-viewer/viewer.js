/* Copyright 2016 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals pdfjsLib, pdfjsViewer */

'use strict';

if (!pdfjsLib.getDocument || !pdfjsViewer.PDFViewer) {
    alert('Please build the pdfjs-dist library using\n `gulp dist-install`');
}

var USE_ONLY_CSS_ZOOM = true;
var TEXT_LAYER_MODE = 0; // DISABLE
var MAX_IMAGE_SIZE = 1024 * 1024;
var CMAP_URL = 'https://unpkg.com/pdfjs-dist@2.0.489/cmaps/';
var CMAP_PACKED = true;

pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@2.0.489/build/pdf.worker.js';

var DEFAULT_URL = location.search.substring(1);
var DEFAULT_SCALE_VALUE = 'auto';

var PDFViewerApplication = {
    pdfLoadingTask: null,
    pdfDocument: null,
    pdfViewer: null,
    pdfHistory: null,
    pdfLinkService: null,

    /**
     * Opens PDF document specified by URL.
     * @returns {Promise} - Returns the promise, which is resolved when document
     *                      is opened.
     */
    open: function (params) {
        if (this.pdfLoadingTask) {
            // We need to destroy already opened document
            return this.close().then(function () {
                // ... and repeat the open() call.
                return this.open(params);
            }.bind(this));
        }

        // var url = params.url;
        var self = this;
        // this.setTitleUsingUrl(url);

        var pdfData = atob(PdfJSInterface.getPdfData());

        // Loading document.
        var loadingTask = pdfjsLib.getDocument({
            data: pdfData,
            maxImageSize: MAX_IMAGE_SIZE,
            cMapUrl: CMAP_URL,
            cMapPacked: CMAP_PACKED,
        });
        this.pdfLoadingTask = loadingTask;

        loadingTask.onProgress = function (progressData) {
            self.progress(progressData.loaded / progressData.total);
        };

        return loadingTask.promise.then(function (pdfDocument) {
            // Document loaded, specifying document for the viewer.
            self.pdfDocument = pdfDocument;
            self.pdfViewer.setDocument(pdfDocument);
            self.pdfLinkService.setDocument(pdfDocument);
            self.pdfHistory.initialize(pdfDocument.fingerprint);

            self.loadingBar.hide();
            self.setTitleUsingMetadata(pdfDocument);
            PdfJSInterface.onPageNumChange(1,PDFViewerApplication.pagesCount);
        }, function (exception) {
            var message = exception && exception.message;
            var l10n = self.l10n;
            var loadingErrorMessage;

            if (exception instanceof pdfjsLib.InvalidPDFException) {
                // change error message also for other builds
                loadingErrorMessage = l10n.get('invalid_file_error', null,
                    'Invalid or corrupted PDF file.');
            } else if (exception instanceof pdfjsLib.MissingPDFException) {
                // special message for missing PDFs
                loadingErrorMessage = l10n.get('missing_file_error', null,
                    'Missing PDF file.');
            } else if (exception instanceof pdfjsLib.UnexpectedResponseException) {
                loadingErrorMessage = l10n.get('unexpected_response_error', null,
                    'Unexpected server response.');
            } else {
                loadingErrorMessage = l10n.get('loading_error', null,
                    'An error occurred while loading the PDF.');
            }

            loadingErrorMessage.then(function (msg) {
                self.error(msg, {message: message});
            });
            self.loadingBar.hide();
            PdfJSInterface.onPageError();
        });
    },

    /**
     * Closes opened PDF document.
     * @returns {Promise} - Returns the promise, which is resolved when all
     *                      destruction is completed.
     */
    close: function () {
        var errorWrapper = document.getElementById('errorWrapper');
        errorWrapper.setAttribute('hidden', 'true');

        if (!this.pdfLoadingTask) {
            return Promise.resolve();
        }

        var promise = this.pdfLoadingTask.destroy();
        this.pdfLoadingTask = null;

        if (this.pdfDocument) {
            this.pdfDocument = null;

            this.pdfViewer.setDocument(null);
            this.pdfLinkService.setDocument(null, null);
        }

        return promise;
    },

    get loadingBar() {
        var bar = new pdfjsViewer.ProgressBar('#loadingBar', {});

        return pdfjsLib.shadow(this, 'loadingBar', bar);
    },

    setTitleUsingUrl: function pdfViewSetTitleUsingUrl(url) {
        this.url = url;
        var title = pdfjsLib.getFilenameFromUrl(url) || url;
        try {
            title = decodeURIComponent(title);
        } catch (e) {
            // decodeURIComponent may throw URIError,
            // fall back to using the unprocessed url in that case
        }
    },

    setTitleUsingMetadata: function (pdfDocument) {
        var self = this;
        pdfDocument.getMetadata().then(function (data) {
            var info = data.info, metadata = data.metadata;
            self.documentInfo = info;
            self.metadata = metadata;
        });
    },

    error: function pdfViewError(message, moreInfo) {
        var l10n = this.l10n;
        var moreInfoText = [l10n.get('error_version_info',
            {
                version: pdfjsLib.version || '?',
                build: pdfjsLib.build || '?'
            },
            'PDF.js v{{version}} (build: {{build}})')];

        if (moreInfo) {
            moreInfoText.push(
                l10n.get('error_message', {message: moreInfo.message},
                    'Message: {{message}}'));
            if (moreInfo.stack) {
                moreInfoText.push(
                    l10n.get('error_stack', {stack: moreInfo.stack},
                        'Stack: {{stack}}'));
            } else {
                if (moreInfo.filename) {
                    moreInfoText.push(
                        l10n.get('error_file', {file: moreInfo.filename},
                            'File: {{file}}'));
                }
                if (moreInfo.lineNumber) {
                    moreInfoText.push(
                        l10n.get('error_line', {line: moreInfo.lineNumber},
                            'Line: {{line}}'));
                }
            }
        }
    },

    progress: function pdfViewProgress(level) {
        var percent = Math.round(level * 100);
        // Updating the bar if value increases.
        if (percent > this.loadingBar.percent || isNaN(percent)) {
            this.loadingBar.percent = percent;
        }
    },

    get pagesCount() {
        return this.pdfDocument.numPages;
    },

    set page(val) {
        this.pdfViewer.currentPageNumber = val;
    },

    get page() {
        return this.pdfViewer.currentPageNumber;
    },

    initUI: function pdfViewInitUI() {
        var linkService = new pdfjsViewer.PDFLinkService();
        this.pdfLinkService = linkService;

        this.l10n = pdfjsViewer.NullL10n;

        var container = document.getElementById('viewerContainer');
        var pdfViewer = new pdfjsViewer.PDFViewer({
            container: container,
            linkService: linkService,
            l10n: this.l10n,
            useOnlyCssZoom: USE_ONLY_CSS_ZOOM,
            textLayerMode: TEXT_LAYER_MODE,
        });
        this.pdfViewer = pdfViewer;
        linkService.setViewer(pdfViewer);

        this.pdfHistory = new pdfjsViewer.PDFHistory({
            linkService: linkService
        });
        linkService.setHistory(this.pdfHistory);
        var first  = true;
        var scrollHandler = function() {
                                     if (first){
                                                    first = false;
                                                    container.scrollTop = 0;
                                                    container.removeEventListener('scroll',scrollHandler);
                                                }
                                    };
        container.addEventListener('scroll',scrollHandler);
        container.addEventListener('pagesinit', function () {
            // We can use pdfViewer now, e.g. let's change default scale.
            pdfViewer.currentScaleValue = DEFAULT_SCALE_VALUE;
        });
        container.addEventListener('pagechange', function (evt) {
            var page = evt.pageNumber;
            var numPages = PDFViewerApplication.pagesCount;
            PdfJSInterface.onPageNumChange(page,numPages);
            console.debug("page = " + page + " numPages = " + numPages);

        }, true);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    PDFViewerApplication.initUI();
}, true);

(function animationStartedClosure() {
    // The offsetParent is not set until the PDF.js iframe or object is visible.
    // Waiting for first animation.
    PDFViewerApplication.animationStartedPromise = new Promise(
        function (resolve) {
            window.requestAnimationFrame(resolve);
        });
})();

// We need to delay opening until all HTML is loaded.
PDFViewerApplication.animationStartedPromise.then(function () {
    PDFViewerApplication.open({
        url: DEFAULT_URL
    });
});
