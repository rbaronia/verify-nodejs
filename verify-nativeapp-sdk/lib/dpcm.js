/**
 * MIT License
 * Copyright 2020 - IBM Corp.
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions: The above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const LRU = require('lru-cache');

const transactionUtils = require('./utils/transactionUtils');
const base64Utils = require('./utils/base64Utils');
const ConfigurationError = require('./errors/configurationError');
const TransactionError = require('./errors/transactionError');
const TokenError = require('./errors/tokenError');
const DpcmService = require('./services/dpcm/dpcmService');

/**
 * Class representing the DPCM SDK. Used to perform Data Privacy and Consent
 * operations.
 * @author Jon Harry <jonharry@uk.ibm.com>
 */
class Dpcm {
  /**
   * Create a new {@link Dpcm} object.
   * @param {Object} config The configuration settings used for requests.
   * @param {string} config.clientId The identifier of the client application.
   * @param {string} config.clientSecret The client application secret.
   * @param {string} config.tenantUrl The URL of the tenant.
   * @throws {ConfigurationError} The configuration object doesn't contain the
   * required properties.
   */
  constructor(config,token,options) {
    if (!config.clientId) {
      throw new ConfigurationError(
          `Cannot find property 'clientId' in configuration settings.`);
    } else if (!config.clientSecret) {
      throw new ConfigurationError(
          `Cannot find property 'clientSecret' in configuration settings.`);
    } else if (!config.tenantUrl) {
      throw new ConfigurationError(
          `Cannot find property 'tenantUrl' in configuration settings.`);
    }

    this._config = config;

   if (!token) {
     throw new ConfigurationError(
       `Cannot find token parameter.`);
   }

   this._token = token;
   this._options = options;

    console.log(`[${Dpcm.name}:constructor(config, token, options)]`,
        'clientId:', this._config.clientId);
    console.log(`[${Dpcm.name}:constructor(config, token, options)]`,
        'clientSecret:', '****');
    console.log(`[${Dpcm.name}:constructor(config, token, options)]`,
        'tenantUrl:', this._config.tenantUrl);
    console.log(`[${Dpcm.name}:constructor(config, token, options)]`,
        'token:', '****');
    console.log(`[${Dpcm.name}:constructor(config, token, options)]`,
        'options:', JSON.stringify(options));
  }

  async getDSP(purposes) {
    let result = undefined;
    try {
    let dpcm = new DpcmService(this._token,this._config.tenantUrl);
    result = await dpcm.getDSP(purposes, this._options);
  } catch (e) {console.log(e)};
    return result;
  }

}

module.exports.Dpcm = Dpcm
