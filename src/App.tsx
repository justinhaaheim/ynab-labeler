import type {StandardTransactionType} from './LabelTypes';
import type {MatchCandidate} from './Matching';
import type {UpdateLog} from './Sync';
import type {SelectChangeEvent} from '@mui/material/Select';
import type {Account, BudgetSummary, TransactionDetail} from 'ynab';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
// import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
// import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {useEffect, useState} from 'react';
import * as ynab from 'ynab';

import packageJson from '../package.json';
// accounts for budgetID 21351b66-d7c6-4e53-895b-b8cd753c2347
import accountsCachedJson from './accountsCached.local.json';
import budgetsCachedJson from './budgetsCached.local.json';
import {
  convertYnabCsvToStandardTransaction,
  convertYnabToStandardTransaction,
} from './Converters';
import {getParsedLabels} from './getParsedLabels';
import LabelTransactionMatchTable from './LabelTransactionMatchTable';
import MatchCandidateTable from './MatchCandidateTable';
import {
  getMatchCandidatesForAllLabels,
  resolveBestMatchForLabels,
} from './Matching';
import {syncLabelsToYnab, undoSyncLabelsToYnab} from './Sync';
import TransactionListItems from './TransactionListItems';

const budgetIDForCachedAccounts = '21351b66-d7c6-4e53-895b-b8cd753c2347';

const USE_CACHED_RESPONSES = true;
const CACHED_RESPONSE_ARTIFICIAL_DELAY_MS = 500;

const UNDERSCORE_STRING = '__';

const YNAB_ACCESS_TOKEN = import.meta.env.VITE_YNAB_ACCESS_TOKEN;

const ynabAPI = new ynab.API(YNAB_ACCESS_TOKEN);

// @ts-ignore - remove later
window.ynabAPI = ynabAPI;

function App() {
  const [budgets, setBudgets] = useState<BudgetSummary[] | null>(null);
  const [selectedBudgetID, setSelectedBudgetID] = useState<string | null>(null);

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [selectedAccountID, setSelectedAccountID] = useState<string | null>(
    null,
  );

  const [transactions, setTransactions] = useState<TransactionDetail[] | null>(
    null,
  );

  const [labels, _setLabels] = useState<StandardTransactionType[]>(() =>
    convertYnabCsvToStandardTransaction(getParsedLabels()),
  );

  const [matchCandidates, setMatchCandidates] = useState<
    MatchCandidate[] | null
  >(null);

  const [updateLogs, setUpdateLogs] = useState<UpdateLog[] | null>(null);

  const [undoUpdateLogs, setUndoUpdateLogs] = useState<UpdateLog[] | null>(
    null,
  );

  const finalizedMatches =
    matchCandidates != null ? resolveBestMatchForLabels(matchCandidates) : [];

  const successfulMatchesCount = finalizedMatches.filter(
    (match) => match.transactionMatch != null,
  ).length;

  const successfulSyncsCount: number | null =
    updateLogs?.filter((log) => log.updateSucceeded).length ?? null;

  const successfulUndosCount: number | null =
    undoUpdateLogs?.filter((log) => log.updateSucceeded).length ?? null;

  useEffect(() => {
    if (budgets == null) {
      if (!USE_CACHED_RESPONSES) {
        (async function () {
          console.debug('📡 Fetching budgets data...');
          const budgetsResponse = await ynabAPI.budgets.getBudgets();
          setBudgets(budgetsResponse.data.budgets);
        })();
      } else {
        console.debug('Using cached budgets data');
        setTimeout(() => {
          setBudgets(budgetsCachedJson);
        }, CACHED_RESPONSE_ARTIFICIAL_DELAY_MS);
      }
    }
  }, [budgets]);

  useEffect(() => {
    if (selectedBudgetID != null && accounts == null) {
      if (
        USE_CACHED_RESPONSES &&
        selectedBudgetID === budgetIDForCachedAccounts
      ) {
        console.debug('Using cached accounts data');
        setTimeout(() => {
          setAccounts(accountsCachedJson as Account[]);
        }, CACHED_RESPONSE_ARTIFICIAL_DELAY_MS);
      } else {
        (async function () {
          console.debug('📡 Fetching accounts data...');
          const accountsResponse =
            await ynabAPI.accounts.getAccounts(selectedBudgetID);
          setAccounts(accountsResponse.data.accounts);
        })();
      }
    }
  }, [accounts, selectedBudgetID]);

  useEffect(() => {
    if (
      selectedBudgetID != null &&
      selectedAccountID != null &&
      transactions == null
    ) {
      (async function () {
        console.debug('📡 Fetching transactions data...');
        const transactionsResponse =
          await ynabAPI.transactions.getTransactionsByAccount(
            selectedBudgetID,
            selectedAccountID,
          );
        const transactions = transactionsResponse.data.transactions;
        console.debug(`${transactions.length} transactions fetched`);
        setTransactions(transactions);
        // @ts-ignore - remove later
        window.transactions = transactions;
      })();
    }
  }, [selectedAccountID, selectedBudgetID, transactions]);

  /////////////////////////////////////////////////
  // Functions
  /////////////////////////////////////////////////

  return (
    <>
      <Box
        sx={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          minHeight: '100dvh',
          position: 'relative',
        }}>
        <Paper
          elevation={10}
          sx={{
            margin: {sm: 3, xs: 2},
            paddingX: {sm: 3, xs: 1},
            paddingY: {sm: 8, xs: 6},
          }}>
          <Stack alignItems="center" spacing={{sm: 3, xs: 7}}>
            <Box>
              <Typography sx={{marginBottom: 2}} variant="h1">
                YNAB Labeler
              </Typography>
            </Box>

            <Card elevation={2} sx={{width: 'fit-content'}}>
              <CardContent>
                <Typography sx={{marginBottom: 2}} variant="h3">
                  Status
                </Typography>

                <Box sx={{mb: 2, textAlign: 'left'}}>
                  <Typography>{`${
                    transactions?.length ?? UNDERSCORE_STRING
                  } YNAB transactions fetched`}</Typography>

                  <Typography>{`${
                    labels?.length ?? 0
                  } labels loaded`}</Typography>

                  <Typography>{`${
                    matchCandidates == null
                      ? UNDERSCORE_STRING
                      : successfulMatchesCount
                  }/${
                    labels.length
                  } labels matched to a YNAB transaction`}</Typography>

                  <Typography>{`${
                    matchCandidates == null
                      ? UNDERSCORE_STRING
                      : labels.length - successfulMatchesCount
                  } labels had no match`}</Typography>
                </Box>

                <Box sx={{textAlign: 'left'}}>
                  <Typography>{`${successfulSyncsCount ?? UNDERSCORE_STRING}/${
                    updateLogs?.length ?? UNDERSCORE_STRING
                  } YNAB transaction updates successful`}</Typography>

                  <Typography>{`${successfulUndosCount ?? UNDERSCORE_STRING}/${
                    undoUpdateLogs?.length ?? UNDERSCORE_STRING
                  } YNAB undo updates successful`}</Typography>
                </Box>
              </CardContent>
            </Card>

            <Box sx={{minWidth: 240}}>
              <FormControl fullWidth>
                <InputLabel id="budget-selector-label-id">
                  Select your budget
                </InputLabel>
                <Select
                  fullWidth
                  id="budget-selector"
                  label="Select your budget"
                  labelId="budget-selector-label-id"
                  onChange={(event: SelectChangeEvent) => {
                    console.log(event);
                    const newBudgetID = event.target.value;
                    if (selectedBudgetID !== newBudgetID) {
                      console.debug(
                        'New budgetID selected. Clearing accounts and transactions',
                      );
                      setSelectedAccountID(null);
                      setAccounts(null);
                      setTransactions(null);
                      setMatchCandidates(null);
                      setSelectedBudgetID(newBudgetID);
                    }
                  }}
                  value={selectedBudgetID ?? ''}>
                  {
                    // TODO: better handling when empty array is returned
                    budgets == null || budgets.length === 0 ? (
                      <MenuItem key="loading">{'Loading budgets...'}</MenuItem>
                    ) : (
                      budgets?.map((budget) => (
                        <MenuItem key={budget.id} value={budget.id}>
                          {budget.name}
                        </MenuItem>
                      ))
                    )
                  }
                </Select>
              </FormControl>
            </Box>

            <Box sx={{minWidth: 240}}>
              <FormControl disabled={selectedBudgetID == null} fullWidth>
                <InputLabel id="account-selector-label-id">
                  Select your account
                </InputLabel>
                <Select
                  fullWidth
                  id="account-selector"
                  label="Select your account"
                  labelId="account-selector-label-id"
                  onChange={(event: SelectChangeEvent) => {
                    console.log(event);
                    const newAccountID = event.target.value;
                    if (selectedAccountID !== newAccountID) {
                      console.debug(
                        'New accountID selected. Clearing transactions',
                      );
                      setTransactions(null);
                      setMatchCandidates(null);
                      setSelectedAccountID(newAccountID);
                    }
                  }}
                  value={selectedAccountID ?? ''}>
                  {
                    // TODO: better handling when empty array is returned
                    accounts == null || accounts.length === 0 ? (
                      <MenuItem key="loading">{'Loading accounts...'}</MenuItem>
                    ) : (
                      accounts?.map((account) => (
                        <MenuItem key={account.id} value={account.id}>
                          {account.name}
                        </MenuItem>
                      ))
                    )
                  }
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Button
                disabled={
                  transactions == null ||
                  transactions.length === 0 ||
                  labels == null ||
                  labels.length === 0
                }
                onClick={() => {
                  if (transactions == null || labels == null) {
                    console.debug(
                      'Unable to generate match candidates: Transactions or labels not loaded',
                    );
                    return;
                  }
                  const matchCandidates = getMatchCandidatesForAllLabels(
                    labels,
                    transactions,
                  );
                  console.debug('Match candidates generated');
                  console.debug(matchCandidates);
                  setMatchCandidates(matchCandidates);
                }}
                variant="contained">
                Generate match candidates
              </Button>
            </Box>

            <Box>
              <Button
                disabled={
                  transactions == null ||
                  transactions.length === 0 ||
                  labels == null ||
                  labels.length === 0 ||
                  successfulMatchesCount === 0
                }
                onClick={() => {
                  if (selectedBudgetID == null) {
                    console.error('[Sync labels] No budget selected');
                    return;
                  }
                  setUpdateLogs(null);
                  setUndoUpdateLogs(null);

                  syncLabelsToYnab({
                    budgetID: selectedBudgetID,
                    finalizedMatches,
                    ynabAPI,
                  })
                    .then((updateLogs) => {
                      setUpdateLogs(updateLogs);
                    })
                    .catch((error) => {
                      console.error('syncLabelsToYnab error:', error);
                    });
                }}
                variant="contained">
                Sync labels to YNAB
              </Button>
            </Box>

            <Box>
              <Button
                disabled={
                  updateLogs == null ||
                  updateLogs.length === 0 ||
                  undoUpdateLogs != null
                }
                onClick={() => {
                  if (selectedBudgetID == null) {
                    console.error('[Undo Sync labels] No budget selected');
                    return;
                  }
                  if (updateLogs == null) {
                    console.error(
                      '[Undo Sync labels] No update logs available',
                    );
                    return;
                  }

                  undoSyncLabelsToYnab({
                    budgetID: selectedBudgetID,
                    updateLogs,
                    ynabAPI,
                  })
                    .then((undoUpdateLogs) => {
                      setUndoUpdateLogs(undoUpdateLogs);
                    })
                    .catch((error) => {
                      console.error('undoSyncLabelsToYnab error:', error);
                    });
                }}
                variant="contained">
                UNDO Sync
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography sx={{mb: 2}} variant="h3">
                  Labels With No Match
                </Typography>
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography sx={{mb: 2}} variant="h3">
                  Transactions
                </Typography>

                <Typography>{`${
                  transactions?.length ?? 0
                } transactions fetched`}</Typography>

                {transactions != null && (
                  <Box sx={{minWidth: 120}}>
                    <List>
                      {transactions.length === 0 ? (
                        <ListItem key="loading">
                          <ListItemText primary="No transactions available" />
                        </ListItem>
                      ) : (
                        <TransactionListItems
                          transactions={convertYnabToStandardTransaction(
                            transactions,
                          )}
                        />
                      )}
                    </List>
                  </Box>
                )}
              </Grid>

              <Grid item xs={6}>
                <Typography sx={{mb: 2}} variant="h3">
                  Labels
                </Typography>

                <Typography>{`${
                  labels?.length ?? 0
                } labels loaded`}</Typography>

                {labels != null && (
                  <Box sx={{minWidth: 120}}>
                    <List>
                      {labels.length === 0 ? (
                        <ListItem key="loading">
                          <ListItemText primary="No labels available" />
                        </ListItem>
                      ) : (
                        <TransactionListItems transactions={labels} />
                      )}
                    </List>
                  </Box>
                )}
              </Grid>
            </Grid>

            {matchCandidates != null &&
              (matchCandidates.length === 0 ? (
                <Typography>No matches found</Typography>
              ) : (
                <MatchCandidateTable
                  label="Match Candidates"
                  matchCandidates={matchCandidates}
                />
              ))}

            {matchCandidates != null &&
              (matchCandidates.length === 0 ? (
                <Typography>No matches found</Typography>
              ) : (
                <LabelTransactionMatchTable
                  label="Finalized Matches"
                  matches={finalizedMatches}
                />
              ))}
          </Stack>
        </Paper>
      </Box>

      <Typography
        component="div"
        sx={{
          bottom: '2px',
          fontSize: 12,
          left: '50%',
          opacity: 0.1,
          position: 'absolute',
          transform: 'translateX(-50%)',
        }}>
        {`v${packageJson.version}`}
      </Typography>
    </>
  );
}

export default App;
