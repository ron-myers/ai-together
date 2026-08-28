---
title: Prompt for Rewards app
date: 2026-08-19
host: Michael Easter
hostContact: michael@peiitalliance.com
location: The Foundry, 163 Great George Street, Charlottetown
published: true
---

### Backround

I have family members who run a small hot-sauce store. They have a simple rewards-program
that uses a physical card. The program works like so:

* the physical card has 8 tabs along the edges
* for any purchase, 10% of the total amount (pre-tax) is written on a tab
* when 8 tabs are full, the person receives the total as a deduction on the current purchase,
subject to a maximum amount of $50

### Goal

We want an app to replace the physical rewards cards with virtual ones. Some basic goals are:

* basic CRUD operations for a rewards card
* allow user to search for a card by name or phone number
* populate a tab for a given purchase
* if the card is full, compute the total discount for the current purchase
    * allow the user to clear the tabs
* the UX/UI should mimic the physical nature of the card (with tabs) 
* for testing and demo, the app should have 5 users with cards in various states

