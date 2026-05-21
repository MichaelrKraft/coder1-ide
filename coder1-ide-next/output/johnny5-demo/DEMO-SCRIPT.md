# Johnny5 Live Demo — Academy Sports Turf
## 20-Minute Runbook for Jason Lowery Meeting

**Before you start:** Paste the full context block from `JOHNNY5-DEMO-CONTEXT.md` into Johnny5.
Wait for it to acknowledge. Then begin the script below.

---

## SCENE 1 — Samsara Alert Response (Minutes 0–4)

**What you say to Jason:**
> "So Samsara pushes alerts to Johnny5 automatically. Watch what happens when a truck goes down."

**Type this into Johnny5:**
```
Johnny5, we just got a Samsara alert — Truck 14 is down. What's the situation and what should we do?
```

**What Johnny5 should respond with:**
- Truck 14 ID, year, plate
- Location (Thornton Municipal)
- Alert type (oil pressure warning, engine shutoff at 8:14am)
- Marcus Torres is on site but truck is unusable
- Suggests: tow truck call, assign Derek Johnson to cover Thornton, notify city contact Linda Castillo

**Your follow-up to Jason:**
> "I didn't tell it anything — it pulled Marcus's name, the site address, the project deadline. It knew Derek was free today."

---

## SCENE 2 — MaintainX Work Order (Minutes 4–8)

**Type this:**
```
Create a MaintainX work order for Truck 14 and flag it urgent.
```

**What Johnny5 should output:**
```
Work Order Created — MaintainX

WO Number: WO-2026-0314-VH14
Asset: Truck 14 (2021 Ford F-350, VIN: 1FTBF3DT3MEC72114, Plate: CO-7821)
Issue: Oil pressure warning — engine shutoff triggered at 08:14 AM
Location: Thornton Municipal Sports Complex, 9500 N Grant Ave, Thornton CO 80229
Priority: URGENT
Assigned To: Academy Sports Turf Maintenance Yard (8200 York St, Denver CO)
Reported By: Samsara Fleet Alert (auto-created)
Notes: Vehicle was on active install site. Crew Lead Marcus Torres remains on site.
       Arrange tow to yard. Do NOT restart engine before inspection.
Status: Open
Created: March 18, 2026 — 8:22 AM
```

**What you say:**
> "That took 8 seconds. Normally this is a phone call, three texts, and someone manually logging it."

---

## SCENE 3 — Crew Reassignment + Scheduling (Minutes 8–13)

**Type this:**
```
Truck 14 is down. Thornton install can't stop — the city inspection is April 7 and we have a penalty clause.
Figure out coverage and update the schedule in Outlook.
```

**What Johnny5 should output:**
- Derek Johnson reassigned to Thornton, starting 10am (when he's available)
- Calendar invite created: "Thornton Phase 2 Coverage — Derek Johnson" — Today, 10am–5pm
- Optional: Jason gets a notification email summarizing the disruption and recovery plan

**You say to Jason:**
> "It knew about the penalty clause. It knew Derek was free after 10. It just... handled it."

---

## SCENE 4 — Municipal Proposal Draft (Minutes 13–18)

**Type this:**
```
The Broomfield RFP is due April 15. Draft a municipal proposal for their 3-field project.
FieldTurf is also bidding — we need to win this.
```

**What Johnny5 should output:**
A structured proposal draft including:
- Date, addressed to Patricia Odom, Parks Director, City of Broomfield
- Academy Sports Turf header (company, phone 1-800-372-6639)
- Project scope: 3 multi-use synthetic fields (soccer + lacrosse)
- Why Academy over FieldTurf: 20+ years, Colorado-based, 300+ municipal fields, LEED experience
- Proposed materials, timeline, warranty terms
- Rough pricing (based on $410K estimate)
- LEED certification language
- Contact/signature block

**You say:**
> "That's not a template — it knows it's Broomfield, knows FieldTurf is competing, knows the LEED requirement.
> Normally Sarah would spend a half day on this."

---

## SCENE 5 — Follow-Up Scheduling (Minutes 18–20)

**Type this:**
```
Schedule a follow-up call with Patricia Odom at Broomfield Parks to walk her through the proposal.
Next Tuesday afternoon works — put it on Jason's calendar and send her an invite.
```

**What Johnny5 should output:**
```
Calendar Event Created — Outlook

Subject: Academy Sports Turf — Broomfield Recreation Center Proposal Review
Date: Tuesday, March 24, 2026
Time: 2:00 PM – 3:00 PM MDT
Organizer: Jason Lowery <jason.lowery@academysportsturf.com>
Invitee: Patricia Odom <parks@broomfieldco.gov>

Meeting Notes attached: [Broomfield RFP Summary + Proposal draft]
Conference: Teams link generated

Email to Patricia:
"Hi Patricia — Following up on the Broomfield Recreation Center synthetic fields project.
I'd love to walk you through Academy Sports Turf's proposal in detail. I've sent a
Tuesday 2pm invite — happy to adjust if that doesn't work. Looking forward to the conversation.
— Jason Lowery, Academy Sports Turf | 1-800-372-6639"
```

**Closing line:**
> "That's Johnny5. Fleet, work orders, scheduling, proposals — all from one conversation.
> No switching between 4 apps. No dropped balls. It just runs."

---

## POST-DEMO CLOSE

Once demo is done, say:

> "What I showed you today is what day one looks like. By month two, Johnny5 has learned your schedule
> patterns, your crew preferences, your typical bid language. It gets sharper every week.
>
> The question isn't whether AI like this is coming to your industry — it's whether you or FieldTurf
> gets there first."

---

## Backup Prompts (if Johnny5 goes off-script)

If it doesn't include specific names/data:
```
Use the exact data from the context I gave you — specific truck IDs, crew names, project names, and addresses.
```

If it stalls or asks clarifying questions:
```
Just do it. Make reasonable assumptions and show me the output. We can refine after.
```

If Outlook calendar part doesn't work:
```
Just draft the email to Patricia Odom and show me what you'd send.
```

---

## Tech Setup Checklist (Day of Meeting)

- [ ] Johnny5 running locally (confirm at http://localhost:3002)
- [ ] Context block copied and ready to paste
- [ ] Demo script printed or on second screen
- [ ] Browser tab open to Academy Sports Turf website (for credibility)
- [ ] Have the strategy brief PDF open to reference during conversation
- [ ] Backup: if Johnny5 is down, walk through the screenshots from a previous session
