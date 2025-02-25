import { createAction } from '@reduxjs/toolkit'
import { SupportedLocale } from 'constants/locales'
import { TokenList } from '@uniswap/token-lists'

export interface SerializedToken {
  chainId: number
  address: string
  decimals: number
  symbol?: string
  name?: string
  logoURI?: string
  list?: TokenList
}

export interface SerializedPair {
  token0: SerializedToken
  token1: SerializedToken
}

export const updateMatchesDarkMode = createAction<{ matchesDarkMode: boolean }>('user/updateMatchesDarkMode')
export const updateUserDarkMode = createAction<{ userDarkMode: boolean }>('user/updateUserDarkMode')
export const updateUserExpertMode = createAction<{ userExpertMode: boolean }>('user/updateUserExpertMode')
export const updateUserLocale = createAction<{ userLocale: SupportedLocale }>('user/updateUserLocale')
export const updateUserSlippageTolerance = createAction<{ userSlippageTolerance: number }>(
  'user/updateUserSlippageTolerance',
)
export const updateUserDeadline = createAction<{ userDeadline: number }>('user/updateUserDeadline')
export const addSerializedToken = createAction<{ serializedToken: SerializedToken }>('user/addSerializedToken')
export const removeSerializedToken = createAction<{ chainId: number; address: string }>('user/removeSerializedToken')
export const addSerializedPair = createAction<{ serializedPair: SerializedPair }>('user/addSerializedPair')
export const removeSerializedPair = createAction<{ chainId: number; tokenAAddress: string; tokenBAddress: string }>(
  'user/removeSerializedPair',
)
export const toggleURLWarning = createAction<void>('user/toggleURLWarning')
export const toggleRebrandingAnnouncement = createAction<void>('user/toggleRebrandingAnnouncement')
export const toggleLiveChart = createAction<{ chainId: number }>('user/toggleLiveChart')
export const toggleTradeRoutes = createAction<void>('user/toggleTradeRoutes')
export const toggleTopTrendingTokens = createAction<void>('user/toggleTopTrendingTokens')
