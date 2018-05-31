"use strict"

const path = require('path');
const fs = require('fs');
const eol = require('os').EOL;

class DynamicAngularComponentInjectorPlugin {
    constructor(options) {
        this.options = options;
        this.source = 'described-resolve';
        this.target = 'resolve';
    }

    apply(resolver) {
        var target = this.target;
        var preferredFilePrefix = this.options.preferredFilePrefix;

        /** 
         *  Gets the file path on the system given a relative request path, and the parent system path.
         * @param {string} relativeRequest Relative path to requested resource
         * @param {string} parentPath Parent path on system
         */
        var getFilePath = function (relativeRequest, parentPath) {
            // Strip any relative path traversals
            let strippedRelativeRequest = relativeRequest.replace(/^.+\.\//, '');
            // Need to find any traversals up in the relative request, so we can account for them in our new path
            let splitRequest = relativeRequest.split('/');
            let splitParentPath = parentPath.split('\\');
            for (let relativePathEl of splitRequest)
            {
                if (relativePathEl != '..') 
                {
                    break;
                }
                splitParentPath.pop();
            }
            let filePath = path.join(...splitParentPath, strippedRelativeRequest);
            return filePath;
        }

        /**
         * Returns a new relative resolve request path based on the preferred file name 
         * @param {string} request Full resolve request
         * @param {string} preferredFilePrefixFileName Preferred file name
         */
        var getPreferredRequest = function (request, preferredFilePrefixFileName) {
            let splitRequest = request.request.split('/');
            // Remove the existing file name
            splitRequest.pop();
            // Add the preferred file name
            splitRequest.push(preferredFilePrefixFileName);
            // Build the new relative request path
            let newRequest = '';
            for (let chunk of splitRequest) {
                if (newRequest != '') {
                    newRequest += '/';
                }
                newRequest += chunk;
            }
            return newRequest;
        }

        /**
         * Gets the preferred file name based on the original request and the preferred prefix
         * @param {string} request Full resolve request
         * @param {string} preferredFilePrefix Preferred file name prefix
         */
        var getPreferredFileName = function (request, preferredFilePrefix) {
            // Split the path by directory
            let splitRequest = request.request.split('/');
            // Pop the name of the component
            let componentFileName = splitRequest.pop();
            // Push the new name, with the preferred prefix
            return preferredFilePrefix + '.' + componentFileName;
        }

        /**
         * Determines whether the file with the given path exists
         * @param {string} filePath 
         */
        var doesFileExist = function (filePath) {
            if (filePath.endsWith('.html') ||
                filePath.endsWith('.scss') ||
                filePath.endsWith('.css')) {
                return fs.existsSync(filePath);
            } else {
                return fs.existsSync(filePath + '.ts') ||
                    fs.existsSync(filePath + '.js')

            }
        }

        resolver.plugin(this.source, function (request, callback) {
            // If the preferred file prefix is not provided, or the request is for a file that is not supported, skip
            if (!preferredFilePrefix ||
                (!request.request.endsWith('component') &&
                    !request.request.endsWith('component.html') &&
                    !request.request.endsWith('component.ts') &&
                    !request.request.endsWith('component.js') &&
                    !request.request.endsWith('component.scss') &&
                    !request.request.endsWith('component.css'))) {
                callback();
                return;
            }
            let newRequest = {};
            let preferredFilePrefixFileName = getPreferredFileName(request, preferredFilePrefix);
            let newRelativeRequest = getPreferredRequest(request, preferredFilePrefixFileName);
            // If a replacement with the preferred prefix exists
            if (doesFileExist(getFilePath(newRelativeRequest, request.path))) {
                newRequest = {
                    path: request.path,
                    request: newRelativeRequest,
                    query: request.query,
                    directory: request.directory
                };
                return resolver.doResolve(target, newRequest, 'Path swapped: ' + request.request + '-->' + 'New Path: ' + newRequest.request, callback);
            } else {
                callback();
                return;
            }

        });
    }
}

module.exports = DynamicAngularComponentInjectorPlugin;