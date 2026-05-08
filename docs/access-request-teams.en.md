# Teams message to admin

Hi! Tested the connection on the JSON you sent. Token is valid, full
scope, but `/calm-projects/v1/projects` returns an empty list.

I suspect this `clientid`
(`sb-CALMExtensionAPI!b570849|sapcloudalm-ext-01!b16907`) is not bound
to any CALM project and has no roles in Project & Engagement
Management — so CALM returns nothing regardless of scope. No hard
proof, just a hypothesis.

Honestly, I am not sure where exactly this is configured: in BTP
cockpit at subaccount level (role collections / scope grants for the
XSUAA client), or inside CALM itself (Project Team / Members). I do
have admin rights in CALM, but I keep landing in the documentation
instead of the admin UI — clearly looking in the wrong place.

Could you please:
- point me to where this lives (BTP or CALM, which section exactly);
- and, if possible, assign roles / bind this `clientid` to at least one
  test project. Or, if that is not possible for a service-broker
  client (sb-…), tell me the right path.

Thanks!
