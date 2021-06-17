import { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Contract } from '@ethersproject/contracts'
import { BigNumber } from '@ethersproject/bignumber'

import { exchangeCient } from 'apollo/client'
import { FARM_DATA } from 'apollo/queries'
import { ChainId, WETH } from 'libs/sdk/src'
import { AppState, useAppDispatch } from 'state'
import { Farm } from 'state/farms/types'
import { setRewardTokens, setFarmsData, setLoading, setError } from './actions'
import { useBlockNumber, useETHPrice } from 'state/application/hooks'
import useFairLaunch from 'hooks/useFairLaunch'
import { useActiveWeb3React } from 'hooks'
import { useFairLaunchContracts } from 'hooks/useContract'
import { FAIRLAUNCH_ADDRESSES, ZERO_ADDRESS } from '../../constants'
import { useAllTokens } from 'hooks/Tokens'

export const useFarms = (): Farm[] => {
  const farms = useSelector((state: AppState) => state.farms.data)
  return farms
}

export const useRewardTokens = () => {
  const dispatch = useAppDispatch()

  const { chainId } = useActiveWeb3React()
  const { getRewardTokens } = useFairLaunch(FAIRLAUNCH_ADDRESSES[chainId as ChainId]?.[0])

  const rewardTokens = useSelector((state: AppState) => state.farms.rewardTokens)

  const fetchRewardTokens = useCallback(async () => {
    try {
      const rewardTokens = await getRewardTokens()
      dispatch(setRewardTokens(rewardTokens))
    } catch (e) {
      dispatch(setRewardTokens([]))
    }
  }, [dispatch, getRewardTokens])

  useEffect(() => {
    if (chainId) {
      fetchRewardTokens()
    }
  }, [chainId, fetchRewardTokens])

  return rewardTokens
}

export const fetchFarms = async (poolsList: string[], chainId?: ChainId) => {
  const result = await exchangeCient[chainId as ChainId].query({
    query: FARM_DATA,
    variables: {
      poolsList
    },
    fetchPolicy: 'network-only'
  })

  return result.data.pools
}

export const useFarmsData = () => {
  const dispatch = useAppDispatch()
  const { chainId, account } = useActiveWeb3React()
  const fairLaunchContracts = useFairLaunchContracts()
  const ethPrice = useETHPrice()
  const allTokens = useAllTokens()
  const blockNumber = useBlockNumber()

  const farmsData = useSelector((state: AppState) => state.farms.data)
  const loading = useSelector((state: AppState) => state.farms.loading)
  const error = useSelector((state: AppState) => state.farms.error)

  useEffect(() => {
    async function getListFarmsForContract(contract: Contract): Promise<Farm[]> {
      const rewardTokenAddresses: string[] = await contract?.getRewardTokens()
      const poolLength = await contract?.poolLength()

      const pids = [...Array(BigNumber.from(poolLength).toNumber()).keys()]

      const poolInfos = await Promise.all(
        pids.map(async (pid: number) => {
          const poolInfo = await contract?.getPoolInfo(pid)

          return {
            ...poolInfo,
            pid
          }
        })
      )

      const stakedBalances = await Promise.all(
        pids.map(async (pid: number) => {
          const stakedBalance = await contract?.getUserInfo(pid, account as string)

          return stakedBalance.amount
        })
      )

      const pendingRewards = await Promise.all(
        pids.map(async (pid: number) => {
          const pendingRewards = await contract?.pendingRewards(pid, account as string)

          return pendingRewards
        })
      )

      const poolAddresses = poolInfos.map(poolInfo => poolInfo.stakeToken.toLowerCase())

      const farmsData = await fetchFarms(poolAddresses, chainId)

      const rewardTokens = rewardTokenAddresses.map(address =>
        address.toLowerCase() === ZERO_ADDRESS.toLowerCase() ? WETH[chainId as ChainId] : allTokens[address]
      )

      const farms: Farm[] = poolInfos.map((poolInfo, index) => {
        return {
          ...farmsData.find(
            (farmData: Farm) => farmData && farmData.id.toLowerCase() === poolInfo.stakeToken.toLowerCase()
          ),
          ...poolInfo,
          rewardTokens,
          fairLaunchAddress: contract.address,
          userData: {
            stakedBalance: stakedBalances[index],
            rewards: pendingRewards[index]
          }
        }
      })

      return farms
    }

    async function checkForFarms() {
      try {
        if (!fairLaunchContracts) {
          return
        }

        dispatch(setLoading(true))

        const getListFarmsPromises: Promise<Farm[]>[] = []

        Object.keys(fairLaunchContracts).forEach(async (address: string) => {
          const fairLaunchContract = fairLaunchContracts[address]
          getListFarmsPromises.push(getListFarmsForContract(fairLaunchContract))
        })

        const farms: Farm[] = (await Promise.all(getListFarmsPromises)).flat()

        dispatch(setFarmsData({ farms }))
      } catch (error) {
        dispatch(setFarmsData({ farms: [] }))
        dispatch(setError(error))
      }

      dispatch(setLoading(false))
    }

    checkForFarms()
  }, [dispatch, ethPrice.currentPrice, chainId, fairLaunchContracts, account, blockNumber])

  return { loading, error, data: farmsData }
}