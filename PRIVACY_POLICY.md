# Privacy Policy for TubePrompt

**Last Updated: June 17, 2026**

TubePrompt ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how our Chrome Extension collects, uses, and safeguards your information.

## 1. Information Collection and Use
TubePrompt is designed to run entirely locally on your device. To function, the extension requires access to the active YouTube video tab to extract the video's transcript (captions) and metadata (title, channel name). 
- **Website Content:** We read the transcript data of the YouTube video you are currently watching solely to generate the AI prompt for you. 
- **No Personal Data Collected:** We do not collect, transmit, store, or share any personally identifiable information (PII), browsing history, or user activity.
- **No External Servers:** All text processing and prompt generation happen locally within your browser. No data is sent to our servers or any third-party servers.

## 2. Permissions Justification
- `activeTab`: Used to access the URL and metadata of the currently active YouTube video.
- `storage`: Used to save your local preferences (such as selected AI Role, Output Language, and Format) to improve your experience.
- `scripting`: Used to inject scripts into the active YouTube page to extract transcript data.
- `host_permissions` (`https://www.youtube.com/*`): Required to securely fetch internal YouTube subtitle APIs.

## 3. Data Sharing and Disclosure
We do not sell, trade, or otherwise transfer your data to outside parties. All data remains on your local machine.

## 4. Changes to this Privacy Policy
We may update our Privacy Policy from time to time. We will notify you of any changes by updating the "Last Updated" date at the top of this policy.

## 5. Contact Us
If you have any questions or suggestions about our Privacy Policy, please contact the developer via the GitHub repository issues page.
