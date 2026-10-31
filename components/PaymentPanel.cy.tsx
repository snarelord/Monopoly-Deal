import React from 'react'
import PaymentPanel from './PaymentPanel'

describe('<PaymentPanel />', () => {
  it('renders', () => {
    // see: https://on.cypress.io/mounting-react
    cy.mount(<PaymentPanel />)
  })
})