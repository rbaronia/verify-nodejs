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

const FactorService = require('../factors/factorService');


/**
 * A class for making knowledge questions related requests to OIDC.
 * @extends FactorService
 * @author Adam Dorogi-Kaposi <adam.dorogi-kaposi@ibm.com>
 */
class QuestionsService extends FactorService {
  /**
   * Request a knowledge questions multi-factor verification for this
   * enrollment.
   * @param {string} enrolmentId The identifier of the knowledge questions
   * enrollment.
   * @return {Promise<Object>} The knowledge questions verification.
   */
  async generate(enrolmentId) {
    const response = await this.post(
        `/v2.0/factors/questions/${enrolmentId}/verifications`);
    return response.data;
  }

  /**
   * Attempt to complete a knowledge questions multi-factor verification.
   * @param {string} verificationId The identifier of the knowledge questions
   * verification received in {@link QuestionsService#generate}.
   * @param {string} enrolmentId The identifier of the knowledge questions
   * enrollment.
   * @param {Object[]} questions The array of question keys and corresponding
   * answers to attempt verification with.
   * @return {Promise<string>} The HTTP response body of the request.
   */
  async verify(verificationId, enrolmentId, questions) {
    const response = await this.post(`/v2.0/factors/questions/` +
        `${enrolmentId}/verifications/${verificationId}`, {questions},
    {returnJwt: true});
    return response.data;
  }
}

module.exports = QuestionsService;
