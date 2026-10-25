package com.swee.ordermanagementspring.api.executive;

import com.swee.ordermanagementspring.api.common.CurrentUser;
import com.swee.ordermanagementspring.api.executive.ExecutiveDtos.AnnualGoal;
import com.swee.ordermanagementspring.api.executive.ExecutiveDtos.AnnualGoalRequest;
import com.swee.ordermanagementspring.api.executive.ExecutiveDtos.ExecutiveOverview;
import com.swee.ordermanagementspring.security.AppPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Painel executivo e meta anual (contrato v6, D-EVO-42 e D-EVO-45). Somente CEO (URL e servico). */
@RestController
@RequestMapping("/executive")
public class ExecutiveController {
    private final ExecutiveService service;

    public ExecutiveController(ExecutiveService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    public ExecutiveOverview overview(@RequestParam @Min(ExecutiveDtos.MIN_YEAR) @Max(ExecutiveDtos.MAX_YEAR) int year) {
        return service.overview(year);
    }

    @PutMapping("/goals/annual")
    public AnnualGoal saveAnnualGoal(@AuthenticationPrincipal AppPrincipal principal,
                                     @Valid @RequestBody AnnualGoalRequest request) {
        return service.saveAnnualGoal(CurrentUser.of(principal), request);
    }
}
