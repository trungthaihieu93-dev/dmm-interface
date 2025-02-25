import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Box, Flex, Text } from 'rebass'
import { useMedia } from 'react-use'
import { ArrowDown } from 'react-feather'
import { Trans } from '@lingui/macro'

import Pagination from 'components/Pagination'
import LocalLoader from 'components/LocalLoader'
import TrendingSoonTokenItem from 'pages/TrueSight/components/TrendingSoonLayout/TrendingSoonTokenItem'
import TrendingSoonTokenDetail from 'pages/TrueSight/components/TrendingSoonLayout/TrendingSoonTokenDetail'
import MobileChartModal from 'pages/TrueSight/components/TrendingSoonLayout/MobileChartModal'
import useGetTrendingSoonData, { TrueSightTokenData } from 'pages/TrueSight/hooks/useGetTrendingSoonData'
import {
  TrueSightChartCategory,
  TrueSightFilter,
  TrueSightSortSettings,
  TrueSightTimeframe,
} from 'pages/TrueSight/index'
import useGetCoinGeckoChartData from 'pages/TrueSight/hooks/useGetCoinGeckoChartData'
import WarningIcon from 'components/LiveChart/WarningIcon'
import useTheme from 'hooks/useTheme'
import { TRENDING_SOON_ITEM_PER_PAGE, TRENDING_SOON_MAX_ITEMS } from 'constants/index'
import useParsedQueryString from 'hooks/useParsedQueryString'
import { useHistory } from 'react-router'
import { useLocation } from 'react-router-dom'

const TrendingSoonLayout = ({
  filter,
  setFilter,
  sortSettings,
  setSortSettings,
}: {
  filter: TrueSightFilter
  setFilter: React.Dispatch<React.SetStateAction<TrueSightFilter>>
  sortSettings: TrueSightSortSettings
  setSortSettings: React.Dispatch<React.SetStateAction<TrueSightSortSettings>>
}) => {
  const [selectedToken, setSelectedToken] = useState<TrueSightTokenData>()
  const [isOpenChartModal, setIsOpenChartModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const { tab, token_id: selectedTokenIdFromQs } = useParsedQueryString()
  const history = useHistory()
  const location = useLocation()

  const {
    data: trendingSoonData,
    isLoading: isLoadingTrendingSoonTokens,
    error: errorWhenLoadingTrendingSoonData,
  } = useGetTrendingSoonData(filter, TRENDING_SOON_MAX_ITEMS)
  const maxPage = Math.min(
    Math.ceil((trendingSoonData?.total_number_tokens ?? 1) / TRENDING_SOON_ITEM_PER_PAGE),
    TRENDING_SOON_MAX_ITEMS / TRENDING_SOON_ITEM_PER_PAGE,
  )
  const trendingSoonTokens = useMemo(() => trendingSoonData?.tokens ?? [], [trendingSoonData])

  // token_id in query param
  useEffect(() => {
    if (selectedTokenIdFromQs && trendingSoonTokens.length) {
      const newSelectedTokenData = trendingSoonTokens.find(
        tokenData => tokenData.token_id.toString() === selectedTokenIdFromQs,
      )
      history.replace({ ...location, search: `?tab=${tab}` })
      setFilter(prev => ({ ...prev, selectedTag: undefined, selectedTokenData: newSelectedTokenData }))
    }
  }, [history, location, selectedTokenIdFromQs, setFilter, tab, trendingSoonTokens])

  useEffect(() => {
    setCurrentPage(1)
  }, [filter])

  const [chartTimeframe, setChartTimeframe] = useState<TrueSightTimeframe>(TrueSightTimeframe.ONE_DAY)
  const [chartCategory, setChartCategory] = useState<TrueSightChartCategory>(TrueSightChartCategory.TRADING_VOLUME)
  const selectedTokenNetwork = useMemo(
    () => (selectedToken ? selectedToken.platforms.keys().next().value ?? undefined : undefined),
    [selectedToken],
  )
  const selectedTokenAddress = useMemo(
    () => (selectedToken && selectedTokenNetwork ? selectedToken.platforms.get(selectedTokenNetwork) : undefined),
    [selectedToken, selectedTokenNetwork],
  )
  const { data: chartData, isLoading: isChartDataLoading } = useGetCoinGeckoChartData(
    selectedTokenNetwork,
    selectedTokenAddress,
    chartTimeframe,
  )

  const theme = useTheme()

  const sortedPaginatedTrendingSoonTokens = useMemo(() => {
    const { sortBy, sortDirection } = sortSettings
    const rankComparer = (a: TrueSightTokenData, b: TrueSightTokenData) => (a.rank && b.rank ? a.rank - b.rank : 0)
    const nameComparer = (a: TrueSightTokenData, b: TrueSightTokenData) =>
      a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
    const discoveredOnComparer = (a: TrueSightTokenData, b: TrueSightTokenData) => a.discovered_on - b.discovered_on
    let res = trendingSoonTokens.sort(
      sortBy === 'rank' ? rankComparer : sortBy === 'name' ? nameComparer : discoveredOnComparer,
    )
    res = sortDirection === 'asc' ? res : res.reverse()

    // Paginating
    res = res.slice((currentPage - 1) * TRENDING_SOON_ITEM_PER_PAGE, currentPage * TRENDING_SOON_ITEM_PER_PAGE)

    return res
  }, [currentPage, sortSettings, trendingSoonTokens])

  const above1200 = useMedia('(min-width: 1200px)')

  useEffect(() => {
    if (above1200 && sortedPaginatedTrendingSoonTokens.length) setSelectedToken(sortedPaginatedTrendingSoonTokens[0])
  }, [currentPage, above1200, sortedPaginatedTrendingSoonTokens])

  return (
    <>
      <TrueSightContainer>
        {isLoadingTrendingSoonTokens ? (
          <LocalLoader />
        ) : errorWhenLoadingTrendingSoonData || sortedPaginatedTrendingSoonTokens.length === 0 ? (
          <Flex
            flexDirection="column"
            height="100%"
            justifyContent="center"
            alignItems="center"
            style={{ height: '668.5px', gap: '16px' }}
          >
            <WarningIcon />
            <Text color={theme.disableText}>
              <Trans>No token found</Trans>
            </Text>
          </Flex>
        ) : (
          <Box>
            <TrendingSoonTokenListHeaderWrapper>
              <TrendingSoonTokenListHeader>
                <TrendingSoonTokenListHeaderItem
                  style={{ width: '34px', cursor: 'pointer' }}
                  onClick={() => {
                    setSortSettings(prev => ({
                      sortBy: 'rank',
                      sortDirection: prev.sortBy === 'rank' ? (prev.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc',
                    }))
                    setCurrentPage(1)
                  }}
                >
                  <div style={{ marginLeft: '4px' }}>#</div>
                  {sortSettings.sortBy === 'rank' && (
                    <ArrowDown
                      color={theme.subText}
                      size={12}
                      style={{ transform: sortSettings.sortDirection === 'desc' ? 'rotate(180deg)' : 'unset' }}
                    />
                  )}
                </TrendingSoonTokenListHeaderItem>
                <TrendingSoonTokenListHeaderItem style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      width: 'fit-content',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      setSortSettings(prev => ({
                        sortBy: 'name',
                        sortDirection: prev.sortBy === 'name' ? (prev.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc',
                      }))
                      setCurrentPage(1)
                    }}
                  >
                    <div>
                      <Trans>Name</Trans>
                    </div>
                    {sortSettings.sortBy === 'name' && (
                      <ArrowDown
                        color={theme.subText}
                        size={12}
                        style={{ transform: sortSettings.sortDirection === 'desc' ? 'rotate(180deg)' : 'unset' }}
                      />
                    )}
                  </div>
                </TrendingSoonTokenListHeaderItem>
                <TrendingSoonTokenListHeaderItem
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSortSettings(prev => ({
                      sortBy: 'discovered_on',
                      sortDirection:
                        prev.sortBy === 'discovered_on' ? (prev.sortDirection === 'asc' ? 'desc' : 'asc') : 'asc',
                    }))
                    setCurrentPage(1)
                  }}
                >
                  <div>
                    <Trans>Discovered On</Trans>
                  </div>
                  {sortSettings.sortBy === 'discovered_on' && (
                    <ArrowDown
                      color={theme.subText}
                      size={12}
                      style={{ transform: sortSettings.sortDirection === 'desc' ? 'rotate(180deg)' : 'unset' }}
                    />
                  )}
                </TrendingSoonTokenListHeaderItem>
              </TrendingSoonTokenListHeader>
            </TrendingSoonTokenListHeaderWrapper>
            <TrendingSoonTokenListBodyAndDetailContainer>
              <TrendingSoonTokenListBody>
                {sortedPaginatedTrendingSoonTokens.map((tokenData, index) => (
                  <TrendingSoonTokenItem
                    key={tokenData.token_id}
                    isSelected={selectedToken?.token_id === tokenData.token_id}
                    tokenIndex={TRENDING_SOON_ITEM_PER_PAGE * (currentPage - 1) + index + 1}
                    tokenData={tokenData}
                    onSelect={() =>
                      setSelectedToken(prev =>
                        prev?.token_id === tokenData.token_id && !above1200 ? undefined : tokenData,
                      )
                    }
                    setIsOpenChartModal={setIsOpenChartModal}
                    setFilter={setFilter}
                    isShowMedal={sortSettings.sortBy === 'rank' && sortSettings.sortDirection === 'asc'}
                  />
                ))}
              </TrendingSoonTokenListBody>
              <TrendingSoonTokenDetailContainer>
                {selectedToken && (
                  <TrendingSoonTokenDetail
                    tokenData={selectedToken}
                    chartData={chartData}
                    isChartDataLoading={isChartDataLoading}
                    chartCategory={chartCategory}
                    setChartCategory={setChartCategory}
                    chartTimeframe={chartTimeframe}
                    setChartTimeframe={setChartTimeframe}
                    setFilter={setFilter}
                  />
                )}
              </TrendingSoonTokenDetailContainer>
            </TrendingSoonTokenListBodyAndDetailContainer>
            <Pagination
              onPrev={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              onNext={() => setCurrentPage(prev => Math.min(maxPage, prev + 1))}
              currentPage={currentPage}
              maxPage={maxPage}
              style={{ padding: '20px' }}
            />
          </Box>
        )}
      </TrueSightContainer>
      <MobileChartModal
        isOpen={isOpenChartModal}
        setIsOpen={setIsOpenChartModal}
        chartData={chartData}
        isLoading={isChartDataLoading}
        chartCategory={chartCategory}
        setChartCategory={setChartCategory}
        chartTimeframe={chartTimeframe}
        setChartTimeframe={setChartTimeframe}
      />
    </>
  )
}

export const TrueSightContainer = styled.div`
  background: ${({ theme }) => theme.background};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  min-height: 668.5px;

  ${({ theme }) => theme.mediaWidth.upToLarge`
    min-height: unset;
  `}
`

export const TrendingSoonTokenListHeaderWrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.tableHeader};

  ${({ theme }) => theme.mediaWidth.upToLarge`
    display: none;
  `}
`

export const TrendingSoonTokenListHeader = styled.div`
  width: 40%;
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 50px;
`

export const TrendingSoonTokenListHeaderItem = styled.div`
  display: flex;
  align-items: center;
  font-size: 12px;
  line-height: 14px;
  color: ${({ theme }) => theme.subText};
  text-transform: uppercase;
  height: 100%;
`

export const TrendingSoonTokenListBodyAndDetailContainer = styled(Flex)`
  min-height: 560px;

  ${({ theme }) => theme.mediaWidth.upToLarge`
    min-height: unset;
  `}
`

export const TrendingSoonTokenListBody = styled.div`
  width: 40%;
  border-top: 1px solid ${({ theme }) => theme.border};
  border-bottom: 1px solid ${({ theme }) => theme.border};

  & > *:not(:nth-child(10)) {
    border-bottom: 1px solid ${({ theme }) => theme.border};
  }

  ${({ theme }) => theme.mediaWidth.upToLarge`
    flex: 1;
  `}
`

export const TrendingSoonTokenDetailContainer = styled.div`
  width: 60%;
  border-top: 1px solid ${({ theme }) => theme.border};
  border-left: 1px solid ${({ theme }) => theme.border};
  border-bottom: 1px solid ${({ theme }) => theme.border};
  padding: 20px;

  ${({ theme }) => theme.mediaWidth.upToLarge`
    display: none;
  `}
`

export default TrendingSoonLayout
