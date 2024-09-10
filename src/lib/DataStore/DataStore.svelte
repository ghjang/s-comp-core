<svelte:options accessors />

<script lang="ts">
  import {
    type DataProps,
    DataSink,
    type DataStore,
    DefaultDataStore,
  } from "../common/data/DataStore.js";

  let _subscriberCount: number = 0;
  export const subscriberCount: () => number = () => _subscriberCount;
  export let maxSubscriberCount: undefined | number = undefined;
  export let dataProps: DataProps = { sourceComponentName: null };

  let dataStore: DataStore;

  $: if (dataProps) {
    dataStore = new DefaultDataStore(dataProps);
    _subscriberCount = 0;
  }

  export function subscribe(dataSink: DataSink): void {
    if (
      maxSubscriberCount !== undefined &&
      _subscriberCount >= maxSubscriberCount
    ) {
      throw new Error(
        `DataStore: maximum subscriber count exceeded: ${maxSubscriberCount}`,
      );
    }

    dataStore.subscribe(dataSink, () => --_subscriberCount);
    ++_subscriberCount;
  }

  export function set(data: object): void {
    dataStore.set({
      subscriberCount: _subscriberCount,
      dataProps,
      detail: data,
    });
  }
</script>
