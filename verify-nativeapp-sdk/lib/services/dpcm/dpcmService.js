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

const Service = require('../service');


/**
 * A class for making policy related requests to OIDC. These include the initial
 * grant request, as well as validating received JWT assertions.
 * @extends Service
 * @author Adam Dorogi-Kaposi <adam.dorogi-kaposi@ibm.com>
 */

class DpcmService extends Service {
  /**
   * Create a new {@link DpcmService} object.
   * @param {Object} auth The credentials for authentication.
   * @param {string} baseURL The base URL for the DPCM API.
   */
  constructor(token, baseURL) {
    super({accessToken: token}, baseURL, {});
  }

  /**
   * Get the data subject presentation data for a purpose.
   * @param {array<string>} purposes the purposes to get.
   * @param {Object} options options to pass into system.
   * @param {string} options.subjectId
   * @param {boolean} options.isExternalSubject
   * @param {string} options.geoIP
   * @return {Promise<Object>} The HTTP response body containing DSP response.
   * @throws {Error} An error response is received.
   */
  async getDSP(purposes, options) {
    let data = options ? options : {}
    data.purposeId = purposes;

    let response = await this.post('/dpcm/v1.0/privacy/data-subject-presentation', data);
    return response.data;
  }

  /**
   * Get the data usage approval for set of purpose, accesstype, attributeIds.
   * @param {array<item>} items for which approval information should be returned.
   * @param {string} item.purposeId PurposeId
   * @param {string} item.accessTypeId Access Type ID (not name).
   * @param {string} item.attributeId Attribute ID (not name).
   * @return {Promise<Object>} The HTTP response body containing DUA response.
   * @throws {Error} An error response is received.
   */
  async getDUA(items) {
    let data = {
      items: items
    };
    let response = await this.post('/dpcm/v1.0/privacy/data-usage-approval', data);
    return response.data;
  }

  /**
   * Store consents.
   * @param {array<consent>} consents to be stored
   * @param {string} consent.purposeId
   * @param {integer} consent.state
   * @param {string} consent.accessTypeId The ID (not name)
   * @param {string} consent.attributeId optional attribute ID (not name)
   * @return {Promise<Object>} The HTTP response body.
   * @throws {Error} An error response is received.
   */
  async storeConsents(consents) {
    let data = [];
    consents.forEach( (consent,i) => {
      data.push({
        op: "add",
        value: consent
      });
    });

    let response = await this.patch('/dpcm/v1.0/privacy/consents', data);
    return response.data;
  }

  /**
   * Get consents.
   * @return {Promise<Object>} The HTTP response body containing consents.
   * @throws {Error} An error response is received.
   */
  async getConsents() {
    let response = await this.get('/dpcm/v1.0/privacy/consents');
    return response.data;
  }

}

module.exports = DpcmService;
