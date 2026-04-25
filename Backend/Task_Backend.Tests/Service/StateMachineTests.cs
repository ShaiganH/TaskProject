using Project.StateMachine;
using Xunit;

namespace Project.Tests;

/// <summary>
/// Tests for StateMachineLogic — no DB or mocks needed, pure logic.
/// </summary>
public class StateMachineTests
{
    // ── Valid Transitions ─────────────────────────────────────────────────────

    [Fact]
    public void Todo_Can_Transition_To_InProgress()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.Todo, TaskStatus.InProgress);
        Assert.True(result);
    }

    [Fact]
    public void Todo_Can_Transition_To_Cancelled()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.Todo, TaskStatus.Cancelled);
        Assert.True(result);
    }

    [Fact]
    public void InProgress_Can_Transition_To_Completed()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.InProgress, TaskStatus.Completed);
        Assert.True(result);
    }

    [Fact]
    public void InProgress_Can_Transition_To_OnHold()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.InProgress, TaskStatus.OnHold);
        Assert.True(result);
    }

    [Fact]
    public void InProgress_Can_Transition_To_Cancelled()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.InProgress, TaskStatus.Cancelled);
        Assert.True(result);
    }

    [Fact]
    public void OnHold_Can_Transition_To_InProgress()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.OnHold, TaskStatus.InProgress);
        Assert.True(result);
    }

    [Fact]
    public void OnHold_Can_Transition_To_Cancelled()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.OnHold, TaskStatus.Cancelled);
        Assert.True(result);
    }

    // ── Same-state transition (no-op) ─────────────────────────────────────────

    [Theory]
    [InlineData(TaskStatus.Todo)]
    [InlineData(TaskStatus.InProgress)]
    [InlineData(TaskStatus.OnHold)]
    [InlineData(TaskStatus.Completed)]
    [InlineData(TaskStatus.Cancelled)]
    public void Same_State_Transition_Is_Always_Valid(TaskStatus status)
    {
        Assert.True(StateMachineLogic.IsValidTransition(status, status));
    }

    // ── Terminal states ───────────────────────────────────────────────────────

    [Theory]
    [InlineData(TaskStatus.Todo)]
    [InlineData(TaskStatus.InProgress)]
    [InlineData(TaskStatus.OnHold)]
    [InlineData(TaskStatus.Cancelled)]
    public void Completed_Cannot_Transition_To_Anything(TaskStatus next)
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.Completed, next);
        Assert.False(result);
    }

    [Theory]
    [InlineData(TaskStatus.Todo)]
    [InlineData(TaskStatus.InProgress)]
    [InlineData(TaskStatus.OnHold)]
    [InlineData(TaskStatus.Completed)]
    public void Cancelled_Cannot_Transition_To_Anything(TaskStatus next)
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.Cancelled, next);
        Assert.False(result);
    }

    // ── Invalid transitions ───────────────────────────────────────────────────

    [Fact]
    public void Todo_Cannot_Skip_Directly_To_Completed()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.Todo, TaskStatus.Completed);
        Assert.False(result);
    }

    [Fact]
    public void Todo_Cannot_Transition_To_OnHold()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.Todo, TaskStatus.OnHold);
        Assert.False(result);
    }

    [Fact]
    public void OnHold_Cannot_Transition_To_Completed()
    {
        var result = StateMachineLogic.IsValidTransition(TaskStatus.OnHold, TaskStatus.Completed);
        Assert.False(result);
    }
}