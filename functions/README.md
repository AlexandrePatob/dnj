# Pastoral queue Firebase boundary

This is an isolated Firebase Functions package for the pastoral queues. It
does not contain credentials or a service-account file. Select the target
Firebase project through the deploy environment before running Firebase CLI.

`expirePastoralCalls` runs every minute and marks calls unanswered after their
two-minute `expiresAt` deadline as `no-show`.

Notifications remain a planned follow-up: required runtime configuration for
the notification Function (T12) will be provided through Firebase Secret
Manager. The targeted push endpoint and its authentication secret remain
blocked until the official `dnj-game-api` contract is verified (T13); no
broadcast endpoint is permitted.

Use the local rules emulator with:

```sh
npm install
npm run test:emulator
```
